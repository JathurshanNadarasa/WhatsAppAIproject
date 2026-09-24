const pool = require("../../config/database");

const getConversationHistory = async (
    conversationId,
    limit = 10
) => {

    const result = await pool.query(
        `SELECT
            sender_type,
            message_text,
            created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [
            conversationId,
            limit
        ]
    );

    return result.rows.reverse();
};

module.exports = {
    getConversationHistory
};