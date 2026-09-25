// --------------------------------------------------
// Authentication + roles (C15)
// --------------------------------------------------
// authenticate      valid JWT AND the user still exists and
//                   is active (deactivated staff are locked
//                   out immediately, not after 1 day)
// requireAdmin      only role = admin
// --------------------------------------------------

const jwt = require("jsonwebtoken");

const pool = require("../config/database");


const unauthorized = (res, message) =>
    res.status(401).json({ success: false, message });


const authenticate = async (req, res, next) => {

    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (!header) return unauthorized(res, "Authorization token required");
    if (type !== "Bearer" || !token) return unauthorized(res, "Invalid authorization format");

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return unauthorized(res, "Your session has expired. Please sign in again.");
    }

    try {

        const result = await pool.query(
            `SELECT id, business_id, name, role, is_active
             FROM users WHERE id = $1`,
            [decoded.userId]
        );

        const user = result.rows[0];

        if (!user || !user.is_active) {
            return unauthorized(res, "This account is no longer active.");
        }

        // Always use the CURRENT role from the database,
        // so a role change applies without a new login
        req.user = {
            userId: user.id,
            businessId: user.business_id,
            role: user.role,
            name: user.name
        };

        next();

    } catch (error) {

        console.error("Auth check failed:", error.message);
        return res.status(500).json({ success: false, message: "Couldn't check your login" });
    }
};


const requireAdmin = (req, res, next) => {

    if (req.user?.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Only admins can do this."
        });
    }

    next();
};


module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.requireAdmin = requireAdmin;
