// --------------------------------------------------
// Human Handover (C12)
// --------------------------------------------------
//   bot ──request──▶ pending ──accept / staff reply──▶ human
//    ▲                                                  │
//    └──────────── release / auto-release ◀─────────────┘
// While pending/human the bot does not reply.
// --------------------------------------------------

const pool = require("../../config/database");

const { checkReplyWindow, sendToCustomer, sendTemplateToCustomer } = require("../whatsapp/outbound.service");
const { createNotification } = require("../notification/notification.service");


const WAIT_NOTICE_MINUTES =
    Number(process.env.HANDOVER_WAIT_NOTICE_MINUTES) || 5;

const AUTO_RELEASE_HOURS =
    Number(process.env.HANDOVER_AUTO_RELEASE_HOURS) || 24;


// Fixed texts (edit freely)
const handoverAckMessage = (firstName) =>
    `Sure${firstName ? ", " + firstName : ""}! I'm connecting you with our team now. A staff member will reply here shortly 😊`;

const WAIT_NOTICE_MESSAGE =
    "Our team is a little busy right now, but they have your message and will reply as soon as possible. Thank you for waiting 🙏";

const RELEASE_MESSAGE =
    "Thank you for chatting with our team! I'm here if you have any other questions 😊";


const httpError = (status, message) => {
    const error = new Error(message);
    error.statusCode = status;
    return error;
};


const emit = (trigger, event) =>
    require("../automation/automation-engine").emitEvent(trigger, event);


// --------------------------------------------------
// Helpers
// --------------------------------------------------

const getConversation = async (conversationId, businessId, client = pool) => {

    const result = await client.query(
        `SELECT c.*, cu.name AS customer_name, cu.phone AS customer_phone
         FROM conversations c
         JOIN customers cu ON cu.id = c.customer_id
         WHERE c.id = $1 AND c.business_id = $2`,
        [conversationId, businessId]
    );

    return result.rows[0] || null;
};


const addEvent = async (client, { conversationId, businessId, eventType, reason = null, userId = null, targetUserId = null }) => {

    await client.query(
        `INSERT INTO handover_events
            (conversation_id, business_id, event_type, reason, user_id, target_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [conversationId, businessId, eventType, reason, userId, targetUserId]
    );
};


const ensureStaffUser = async (businessId, userId) => {

    if (!userId) return null;

    const result = await pool.query(
        `SELECT id, name FROM users WHERE id = $1 AND business_id = $2`,
        [userId, businessId]
    );

    if (!result.rows[0]) {
        throw httpError(400, "Staff user not found in this business");
    }

    return result.rows[0];
};


// --------------------------------------------------
// bot -> pending
// --------------------------------------------------

const requestHandover = async ({
    businessId,
    conversationId,
    reason = "Handover requested",
    userId = null
}) => {

    const conversation = await getConversation(conversationId, businessId);

    if (!conversation) throw httpError(404, "Conversation not found");

    if (conversation.handover_status !== "bot") {
        return conversation;                       // already with a human
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const updated = await client.query(
            `UPDATE conversations SET
                handover_status = 'pending',
                handover_reason = $1,
                handover_requested_at = CURRENT_TIMESTAMP,
                handover_accepted_at = NULL,
                wait_notice_sent_at = NULL,
                assigned_user_id = NULL
             WHERE id = $2
             RETURNING *`,
            [reason, conversationId]
        );

        await addEvent(client, { conversationId, businessId, eventType: "requested", reason, userId });

        await client.query("COMMIT");

        const leadResult = await pool.query(
            `SELECT id FROM leads WHERE business_id = $1 AND customer_id = $2`,
            [businessId, conversation.customer_id]
        );

        await createNotification({
            businessId,
            type: "handover",
            title: `🙋 Handover waiting: ${conversation.customer_name || conversation.customer_phone}`,
            body: reason,
            leadId: leadResult.rows[0]?.id || null,
            conversationId
        });

        emit("handover_requested", {
            businessId,
            customerId: conversation.customer_id,
            conversationId,
            payload: { new: "pending", reason }
        });

        return updated.rows[0];

    } catch (error) {

        await client.query("ROLLBACK");
        throw error;

    } finally {

        client.release();
    }
};


// --------------------------------------------------
// pending -> human (staff takes it)
// --------------------------------------------------

const acceptHandover = async ({ businessId, conversationId, userId }) => {

    await ensureStaffUser(businessId, userId);

    const conversation = await getConversation(conversationId, businessId);

    if (!conversation) throw httpError(404, "Conversation not found");

    if (conversation.handover_status === "human" && conversation.assigned_user_id && conversation.assigned_user_id !== userId) {
        throw httpError(409, "Another staff member is already handling this conversation");
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const updated = await client.query(
            `UPDATE conversations SET
                handover_status = 'human',
                assigned_user_id = COALESCE($1, assigned_user_id),
                handover_accepted_at = COALESCE(handover_accepted_at, CURRENT_TIMESTAMP),
                handover_requested_at = COALESCE(handover_requested_at, CURRENT_TIMESTAMP),
                handover_reason = COALESCE(handover_reason, 'Taken over by staff')
             WHERE id = $2
             RETURNING *`,
            [userId || null, conversationId]
        );

        await addEvent(client, { conversationId, businessId, eventType: "accepted", userId });

        await client.query("COMMIT");

        return updated.rows[0];

    } catch (error) {

        await client.query("ROLLBACK");
        throw error;

    } finally {

        client.release();
    }
};


// --------------------------------------------------
// Assign to a specific staff member
// --------------------------------------------------

const assignHandover = async ({ businessId, conversationId, targetUserId, userId = null }) => {

    const target = await ensureStaffUser(businessId, targetUserId);

    if (!target) throw httpError(400, "targetUserId is required");

    const conversation = await getConversation(conversationId, businessId);

    if (!conversation) throw httpError(404, "Conversation not found");

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const updated = await client.query(
            `UPDATE conversations SET
                assigned_user_id = $1,
                handover_status = CASE WHEN handover_status = 'bot' THEN 'pending' ELSE handover_status END,
                handover_requested_at = COALESCE(handover_requested_at, CURRENT_TIMESTAMP),
                handover_reason = COALESCE(handover_reason, 'Assigned by staff')
             WHERE id = $2
             RETURNING *`,
            [targetUserId, conversationId]
        );

        await addEvent(client, { conversationId, businessId, eventType: "assigned", userId, targetUserId });

        // Keep the lead owner in sync
        await client.query(
            `UPDATE leads SET assigned_user_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE business_id = $2 AND customer_id = $3`,
            [targetUserId, businessId, conversation.customer_id]
        );

        await client.query("COMMIT");

        await createNotification({
            businessId,
            userId: targetUserId,
            type: "handover",
            title: `👤 Assigned to you: ${conversation.customer_name || conversation.customer_phone}`,
            body: conversation.handover_reason || "Please reply to this customer",
            conversationId
        });

        return updated.rows[0];

    } catch (error) {

        await client.query("ROLLBACK");
        throw error;

    } finally {

        client.release();
    }
};


// --------------------------------------------------
// Staff sends a message (auto-accepts a pending handover)
// --------------------------------------------------

const staffReply = async ({ businessId, conversationId, userId, text }) => {

    if (!String(text || "").trim()) throw httpError(400, "text is required");

    const conversation = await getConversation(conversationId, businessId);

    if (!conversation) throw httpError(404, "Conversation not found");

    // Check WhatsApp's 24h window BEFORE taking over, so a failed
    // send never leaves the chat stuck with the bot switched off
    const window = await checkReplyWindow(conversationId);

    if (!window.ok) {
        throw httpError(422, window.reason);
    }

    // Staff writing into a bot chat = taking it over
    if (conversation.handover_status !== "human") {
        await acceptHandover({ businessId, conversationId, userId });
    }

    const result = await sendToCustomer({
        businessId,
        conversationId,
        text,
        senderType: "staff",
        userId
    });

    if (!result.ok) {
        throw httpError(422, result.reason);
    }

    await pool.query(
        `UPDATE conversations SET last_staff_reply_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [conversationId]
    );

    return result;
};


// --------------------------------------------------
// human/pending -> bot
// --------------------------------------------------

const releaseHandover = async ({
    businessId,
    conversationId,
    userId = null,
    sendMessage = true,
    reason = null,
    auto = false
}) => {

    const conversation = await getConversation(conversationId, businessId);

    if (!conversation) throw httpError(404, "Conversation not found");

    if (conversation.handover_status === "bot") {
        return { conversation, message: null };
    }

    const client = await pool.connect();

    let updated;

    try {

        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE conversations SET
                handover_status = 'bot',
                assigned_user_id = NULL,
                handover_reason = NULL,
                handover_requested_at = NULL,
                handover_accepted_at = NULL,
                wait_notice_sent_at = NULL
             WHERE id = $1
             RETURNING *`,
            [conversationId]
        );

        updated = result.rows[0];

        await addEvent(client, {
            conversationId,
            businessId,
            eventType: auto ? "auto_released" : "released",
            reason,
            userId
        });

        await client.query("COMMIT");

    } catch (error) {

        await client.query("ROLLBACK");
        throw error;

    } finally {

        client.release();
    }

    let message = null;

    if (sendMessage) {
        message = await sendToCustomer({ businessId, conversationId, text: RELEASE_MESSAGE });
    }

    return { conversation: updated, message };
};


// --------------------------------------------------
// Queue for the dashboard
// --------------------------------------------------

const getHandoverQueue = async (businessId, { status } = {}) => {

    const values = [businessId];
    let filter = "c.handover_status IN ('pending', 'human')";

    if (["pending", "human"].includes(status)) {
        values.push(status);
        filter = `c.handover_status = $${values.length}`;
    }

    const result = await pool.query(
        `SELECT
            c.id AS conversation_id,
            c.handover_status,
            c.handover_reason,
            c.handover_requested_at,
            c.handover_accepted_at,
            c.last_staff_reply_at,
            c.last_message_at,
            c.assigned_user_id,
            u.name AS assigned_user_name,
            cu.id AS customer_id,
            cu.name AS customer_name,
            cu.phone AS customer_phone,
            l.id AS lead_id,
            l.temperature,
            l.score,
            ROUND(EXTRACT(EPOCH FROM (NOW() - c.handover_requested_at)) / 60)::int AS waiting_minutes,
            (SELECT m.message_text FROM messages m
             WHERE m.conversation_id = c.id AND m.sender_type = 'customer'
             ORDER BY m.created_at DESC LIMIT 1) AS last_customer_message,
            (SELECT COUNT(*)::int FROM messages m
             WHERE m.conversation_id = c.id AND m.sender_type = 'customer'
             AND m.created_at > COALESCE(c.last_staff_reply_at, c.handover_requested_at)) AS unanswered_count
         FROM conversations c
         JOIN customers cu ON cu.id = c.customer_id
         LEFT JOIN users u ON u.id = c.assigned_user_id
         LEFT JOIN leads l ON l.business_id = c.business_id AND l.customer_id = c.customer_id
         WHERE c.business_id = $1
         AND ${filter}
         ORDER BY (c.handover_status = 'pending') DESC, c.handover_requested_at ASC`,
        values
    );

    return result.rows;
};


const getHandoverEvents = async (conversationId, businessId) => {

    const result = await pool.query(
        `SELECT e.*, u.name AS user_name, t.name AS target_user_name
         FROM handover_events e
         LEFT JOIN users u ON u.id = e.user_id
         LEFT JOIN users t ON t.id = e.target_user_id
         WHERE e.conversation_id = $1 AND e.business_id = $2
         ORDER BY e.created_at DESC, e.id DESC`,
        [conversationId, businessId]
    );

    return result.rows;
};


// --------------------------------------------------
// Timers (called by the automation scheduler)
// --------------------------------------------------

const processHandoverTimers = async () => {

    let notices = 0;
    let released = 0;

    // 1. Nobody accepted within N minutes -> tell the customer once
    const waiting = await pool.query(
        `SELECT id, business_id
         FROM conversations
         WHERE handover_status = 'pending'
         AND wait_notice_sent_at IS NULL
         AND handover_requested_at <= NOW() - ($1 || ' minutes')::interval`,
        [String(WAIT_NOTICE_MINUTES)]
    );

    for (const conv of waiting.rows) {
        try {
            const result = await sendToCustomer({
                businessId: conv.business_id,
                conversationId: conv.id,
                text: WAIT_NOTICE_MESSAGE
            });

            await pool.query(
                `UPDATE conversations SET wait_notice_sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [conv.id]
            );

            await pool.query(
                `INSERT INTO handover_events (conversation_id, business_id, event_type, reason)
                 VALUES ($1, $2, 'wait_notice', $3)`,
                [conv.id, conv.business_id, result.ok ? null : result.reason]
            );

            if (result.ok) notices++;
        } catch (error) {
            console.error(`Wait notice failed for conversation ${conv.id}:`, error.message);
        }
    }

    // 2. Human chat idle for N hours -> give it back to the bot
    const idle = await pool.query(
        `SELECT id, business_id
         FROM conversations
         WHERE handover_status IN ('pending', 'human')
         AND last_message_at <= NOW() - ($1 || ' hours')::interval`,
        [String(AUTO_RELEASE_HOURS)]
    );

    for (const conv of idle.rows) {
        try {
            await releaseHandover({
                businessId: conv.business_id,
                conversationId: conv.id,
                sendMessage: false,
                reason: `No activity for ${AUTO_RELEASE_HOURS}h`,
                auto: true
            });
            released++;
        } catch (error) {
            console.error(`Auto-release failed for conversation ${conv.id}:`, error.message);
        }
    }

    return { notices, released };
};


// --------------------------------------------------
// Templates (C14): the only way to message someone
// after 24h, or someone who never wrote to you
// --------------------------------------------------

const listApprovedTemplates = async (businessId) => {

    const result = await pool.query(
        `SELECT whatsapp_business_account_id FROM businesses WHERE id = $1`,
        [businessId]
    );

    const accountId =
        result.rows[0]?.whatsapp_business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    if (!accountId) throw httpError(400, "WhatsApp Business Account ID is not set for this business");

    const { listTemplates } = require("../whatsapp/whatsapp.sender");

    let templates;

    try {
        templates = await listTemplates({ businessAccountId: accountId });
    } catch (error) {
        throw httpError(502, error.message);
    }

    return templates
        .filter((t) => t.status === "APPROVED")
        .map((t) => {
            const body = (t.components || []).find((c) => c.type === "BODY")?.text || "";
            const params = new Set(body.match(/\{\{\d+\}\}/g) || []).size;
            return { name: t.name, language: t.language, category: t.category, body, params };
        });
};


const staffSendTemplate = async ({ businessId, conversationId, userId, name, language, params = [], preview }) => {

    if (!name) throw httpError(400, "Template name is required");

    const conversation = await getConversation(conversationId, businessId);

    if (!conversation) throw httpError(404, "Conversation not found");

    const result = await sendTemplateToCustomer({
        businessId,
        conversationId,
        name,
        language: language || "en",
        params: Array.isArray(params) ? params.map(String) : [],
        preview: preview ? String(preview).slice(0, 2000) : null,
        senderType: "staff",
        userId
    });

    if (!result.ok) throw httpError(422, result.reason);

    return result;
};


module.exports = {
    listApprovedTemplates,
    staffSendTemplate,
    handoverAckMessage,
    requestHandover,
    acceptHandover,
    assignHandover,
    staffReply,
    releaseHandover,
    getHandoverQueue,
    getHandoverEvents,
    processHandoverTimers
};
