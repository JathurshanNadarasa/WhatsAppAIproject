const pool = require("../../config/database");


const createNotification = async ({
    businessId,
    userId = null,
    type = "automation",
    title,
    body = null,
    leadId = null,
    conversationId = null,
    automationId = null
}) => {

    const result = await pool.query(
        `INSERT INTO notifications
            (business_id, user_id, type, title, body, lead_id, conversation_id, automation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [businessId, userId, type, title, body, leadId, conversationId, automationId]
    );

    const notification = result.rows[0];

    // Real-time push / email comes later; the console shows it for now
    console.log(`🔔 [${type}] ${title}${body ? " - " + body : ""}`);

    return notification;
};


// Notifications for this user + those for all staff (user_id NULL)
const listNotifications = async (
    businessId,
    userId,
    { unreadOnly = false, limit = 50 } = {}
) => {

    const result = await pool.query(
        `SELECT n.*, cu.name AS customer_name, cu.phone AS customer_phone
         FROM notifications n
         LEFT JOIN leads l ON l.id = n.lead_id
         LEFT JOIN customers cu ON cu.id = l.customer_id
         WHERE n.business_id = $1
         AND (n.user_id IS NULL OR n.user_id = $2)
         ${unreadOnly ? "AND n.is_read = FALSE" : ""}
         ORDER BY n.created_at DESC
         LIMIT $3`,
        [businessId, userId || null, Math.min(Number(limit) || 50, 200)]
    );

    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS unread
         FROM notifications
         WHERE business_id = $1
         AND (user_id IS NULL OR user_id = $2)
         AND is_read = FALSE`,
        [businessId, userId || null]
    );

    return {
        unread: countResult.rows[0].unread,
        notifications: result.rows
    };
};


const markRead = async (businessId, notificationId) => {

    const result = await pool.query(
        `UPDATE notifications
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND business_id = $2
         RETURNING *`,
        [notificationId, businessId]
    );

    return result.rows[0] || null;
};


const markAllRead = async (businessId, userId) => {

    const result = await pool.query(
        `UPDATE notifications
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE business_id = $1
         AND (user_id IS NULL OR user_id = $2)
         AND is_read = FALSE`,
        [businessId, userId || null]
    );

    return result.rowCount;
};


module.exports = {
    createNotification,
    listNotifications,
    markRead,
    markAllRead
};
