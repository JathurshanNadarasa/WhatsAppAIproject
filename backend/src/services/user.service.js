// --------------------------------------------------
// Team / staff accounts (C15) - admin only, except the
// simple list used for the "Assign to" dropdown
// --------------------------------------------------

const bcrypt = require("bcryptjs");

const pool = require("../config/database");

const { createUser, validatePassword } = require("./auth.service");


const httpError = (status, message) => {
    const error = new Error(message);
    error.statusCode = status;
    return error;
};


const PUBLIC_FIELDS = "id, business_id, name, email, role, is_active, last_login_at, created_at";


const listUsers = async (businessId, { includeInactive = false } = {}) => {

    const result = await pool.query(
        `SELECT ${PUBLIC_FIELDS},
            (SELECT COUNT(*)::int FROM conversations c
             WHERE c.assigned_user_id = u.id AND c.handover_status <> 'bot') AS open_chats
         FROM users u
         WHERE business_id = $1
         ${includeInactive ? "" : "AND is_active = TRUE"}
         ORDER BY is_active DESC, role, name`,
        [businessId]
    );

    return result.rows;
};


const addUser = async (businessId, data) =>
    createUser({
        businessId,
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role || "staff"
    });


const countActiveAdmins = async (businessId, excludeId) => {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE business_id = $1 AND role = 'admin' AND is_active = TRUE AND id <> $2`,
        [businessId, excludeId]
    );
    return result.rows[0].count;
};


// data: { name?, role?, is_active?, password? }
const updateUser = async (businessId, userId, data, actingUserId) => {

    const existingResult = await pool.query(
        `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1 AND business_id = $2`,
        [userId, businessId]
    );

    const existing = existingResult.rows[0];

    if (!existing) return null;

    const next = {
        name: data.name !== undefined ? String(data.name).trim() : existing.name,
        role: data.role !== undefined ? data.role : existing.role,
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : existing.is_active
    };

    if (!next.name) throw httpError(400, "Name is required");
    if (!["admin", "staff"].includes(next.role)) throw httpError(400, "Role must be admin or staff");

    // Never leave the business without an active admin
    const losingAdmin =
        existing.role === "admin" && existing.is_active &&
        (next.role !== "admin" || !next.is_active);

    if (losingAdmin && (await countActiveAdmins(businessId, userId)) === 0) {
        throw httpError(400, "There must be at least one active admin.");
    }

    if (userId === actingUserId && !next.is_active) {
        throw httpError(400, "You can't deactivate your own account.");
    }

    let passwordHash = null;

    if (data.password !== undefined && data.password !== "") {
        validatePassword(data.password);
        passwordHash = await bcrypt.hash(String(data.password), 12);
    }

    const result = await pool.query(
        `UPDATE users SET
            name = $1, role = $2, is_active = $3,
            password_hash = COALESCE($4, password_hash),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND business_id = $6
         RETURNING ${PUBLIC_FIELDS}`,
        [next.name, next.role, next.is_active, passwordHash, userId, businessId]
    );

    // Deactivated: give their open chats back to the queue
    if (existing.is_active && !next.is_active) {
        await pool.query(
            `UPDATE conversations
             SET assigned_user_id = NULL,
                 handover_status = CASE WHEN handover_status = 'human' THEN 'pending' ELSE handover_status END
             WHERE assigned_user_id = $1 AND business_id = $2`,
            [userId, businessId]
        );
        await pool.query(
            `UPDATE leads SET assigned_user_id = NULL WHERE assigned_user_id = $1 AND business_id = $2`,
            [userId, businessId]
        );
    }

    return result.rows[0];
};


module.exports = {
    listUsers,
    addUser,
    updateUser
};
