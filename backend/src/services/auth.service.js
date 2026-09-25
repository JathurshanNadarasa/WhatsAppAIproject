const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../config/database");


const MIN_PASSWORD_LENGTH = 8;


const httpError = (status, message) => {
    const error = new Error(message);
    error.statusCode = status;
    return error;
};


const normaliseEmail = (email) => String(email || "").trim().toLowerCase();


const validatePassword = (password) => {
    if (String(password || "").length < MIN_PASSWORD_LENGTH) {
        throw httpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
};


// --------------------------------------------------
// Public register (C15: locked down)
// --------------------------------------------------
// Allowed when:
//   - the business has no users yet (first admin), or
//   - not production, or ALLOW_PUBLIC_REGISTER=true
// The first user of a business becomes admin, anyone
// else registered this way becomes staff. The role in
// the request body is ignored.
// Normal way to add people: admin -> Team page.
// --------------------------------------------------

const registerUser = async ({ businessId, name, email, password }) => {

    const business = await pool.query(`SELECT id FROM businesses WHERE id = $1`, [businessId]);

    if (!business.rows[0]) throw httpError(400, "Business not found");

    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE business_id = $1 AND is_active = TRUE`,
        [businessId]
    );

    const firstUser = countResult.rows[0].count === 0;

    const open =
        process.env.NODE_ENV !== "production" ||
        process.env.ALLOW_PUBLIC_REGISTER === "true";

    if (!firstUser && !open) {
        throw httpError(403, "Registration is closed. Ask your admin to add you from the Team page.");
    }

    return createUser({
        businessId,
        name,
        email,
        password,
        role: firstUser ? "admin" : "staff"
    });
};


const createUser = async ({ businessId, name, email, password, role = "staff" }) => {

    const cleanEmail = normaliseEmail(email);
    const cleanName = String(name || "").trim();

    if (!cleanName) throw httpError(400, "Name is required");
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw httpError(400, "Enter a valid email address");
    if (!["admin", "staff"].includes(role)) throw httpError(400, "Role must be admin or staff");

    validatePassword(password);

    const existing = await pool.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [cleanEmail]);

    if (existing.rows.length > 0) throw httpError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(String(password), 12);

    const result = await pool.query(
        `INSERT INTO users (business_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, business_id, name, email, role, is_active, created_at`,
        [businessId, cleanName, cleanEmail, passwordHash, role]
    );

    return result.rows[0];
};


const loginUser = async (email, password) => {

    const result = await pool.query(
        `SELECT id, business_id, name, email, password_hash, role, is_active
         FROM users
         WHERE LOWER(email) = $1`,
        [normaliseEmail(email)]
    );

    const user = result.rows[0];

    // Same message for every failure: don't reveal which emails exist
    const invalid = () => httpError(401, "Invalid email or password");

    if (!user) throw invalid();

    const passwordMatch = await bcrypt.compare(String(password || ""), user.password_hash).catch(() => false);

    if (!passwordMatch) throw invalid();

    if (!user.is_active) throw httpError(403, "This account has been deactivated. Ask your admin.");

    await pool.query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);

    const token = jwt.sign(
        { userId: user.id, businessId: user.business_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return {
        user: {
            id: user.id,
            businessId: user.business_id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        token
    };
};


module.exports = {
    MIN_PASSWORD_LENGTH,
    normaliseEmail,
    validatePassword,
    registerUser,
    createUser,
    loginUser
};
