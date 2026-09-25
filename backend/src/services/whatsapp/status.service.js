// --------------------------------------------------
// Delivery status updates from Meta (C14)
// sent -> delivered -> read   (or failed)
// Statuses can arrive out of order, so never move
// backwards (e.g. "delivered" after "read").
// --------------------------------------------------

const pool = require("../../config/database");


const RANK = { pending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };


const applyStatusUpdate = async ({ messageId, status, error, timestamp }) => {

    if (!messageId || !(status in RANK)) return false;

    const result = await pool.query(
        `UPDATE messages
         SET delivery_status = $2,
             delivery_error = COALESCE($3, delivery_error),
             status_updated_at = $4
         WHERE whatsapp_message_id = $1
         AND (
            delivery_status IS NULL
            OR $2 = 'failed'
            OR (CASE delivery_status
                    WHEN 'pending' THEN 0 WHEN 'sent' THEN 1
                    WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 ELSE 4 END) < $5
         )`,
        [messageId, status, error || null, timestamp || new Date(), RANK[status]]
    );

    if (status === "failed") {
        console.error(`WhatsApp delivery failed for ${messageId}: ${error}`);
    }

    return result.rowCount > 0;
};


module.exports = {
    applyStatusUpdate
};
