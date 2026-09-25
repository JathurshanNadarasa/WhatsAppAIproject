const pool = require("../config/database");

const getConversations = async (businessId) => {
    const result = await pool.query(
        `SELECT
            c.id,
            c.customer_id,
            cu.name AS customer_name,
            cu.phone AS customer_phone,
            cu.name_confirmed,
            c.status,
            c.started_at,
            c.last_message_at,
            c.handover_status,
            c.assigned_user_id,
            l.id AS lead_id,
            l.temperature,
            l.score,
            last.message_text AS last_message_text,
            last.sender_type AS last_sender_type
        FROM conversations c
        INNER JOIN customers cu
            ON c.customer_id = cu.id
        LEFT JOIN leads l
            ON l.business_id = c.business_id AND l.customer_id = c.customer_id
        LEFT JOIN LATERAL (
            SELECT m.message_text, m.sender_type
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
        ) last ON TRUE
        WHERE c.business_id = $1
        ORDER BY c.last_message_at DESC
        LIMIT 200`,
        [businessId]
    );

    return result.rows;
};

const getConversationById = async (
    conversationId,
    businessId
) => {
    const result = await pool.query(
        `SELECT
            c.id,
            c.business_id,
            c.customer_id,
            cu.name AS customer_name,
            cu.phone AS customer_phone,
            c.status,
            c.started_at,
            c.last_message_at,
            c.handover_status,
            c.handover_reason,
            c.assigned_user_id
        FROM conversations c
        INNER JOIN customers cu
            ON c.customer_id = cu.id
        WHERE c.id = $1
        AND c.business_id = $2`,
        [
            conversationId,
            businessId
        ]
    );

    return result.rows[0];
};

const getConversationMessages = async (
    conversationId,
    businessId
) => {
    const result = await pool.query(
        `SELECT
            m.id,
            m.sender_type,
            m.message_type,
            m.message_text,
            m.created_at,
            m.sent_by_user_id,
            u.name AS sent_by_user_name,
            m.delivery_status,
            m.delivery_error,
            m.template_name
        FROM messages m
        INNER JOIN conversations c
            ON m.conversation_id = c.id
        LEFT JOIN users u
            ON u.id = m.sent_by_user_id
        WHERE m.conversation_id = $1
        AND c.business_id = $2
        ORDER BY m.created_at ASC, m.id ASC`,
        [
            conversationId,
            businessId
        ]
    );

    return result.rows;
};

module.exports = {
    getConversations,
    getConversationById,
    getConversationMessages
};