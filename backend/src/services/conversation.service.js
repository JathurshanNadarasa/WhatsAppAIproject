const pool = require("../config/database");

const getConversations = async (businessId) => {
    const result = await pool.query(
        `SELECT
            c.id,
            c.customer_id,
            cu.name AS customer_name,
            cu.phone AS customer_phone,
            c.status,
            c.started_at,
            c.last_message_at
        FROM conversations c
        INNER JOIN customers cu
            ON c.customer_id = cu.id
        WHERE c.business_id = $1
        ORDER BY c.last_message_at DESC`,
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
            c.last_message_at
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
            m.created_at
        FROM messages m
        INNER JOIN conversations c
            ON m.conversation_id = c.id
        WHERE m.conversation_id = $1
        AND c.business_id = $2
        ORDER BY m.created_at ASC`,
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