// --------------------------------------------------
// Outbound messages (C12, real sending in C14)
// One place for every message WE send to a customer:
// bot replies, staff replies, handover notices,
// automations and templates.
//
// - Enforces WhatsApp's 24h customer-service window
//   (templates are allowed any time)
// - Sends via Meta only when WHATSAPP_SENDING_ENABLED=true
// - Always saves the message, with its delivery_status
// --------------------------------------------------

const pool = require("../../config/database");


const WHATSAPP_WINDOW_HOURS = 24;

const sendingEnabled = () => process.env.WHATSAPP_SENDING_ENABLED === "true";


const hoursSinceLastCustomerMessage = async (conversationId) => {

    const result = await pool.query(
        `SELECT MAX(created_at) AS at
         FROM messages
         WHERE conversation_id = $1 AND sender_type = 'customer'`,
        [conversationId]
    );

    const at = result.rows[0]?.at;

    return at ? (Date.now() - new Date(at).getTime()) / 3600000 : null;
};


// Can we send a free-form message right now? (no side effects)
const checkReplyWindow = async (conversationId) => {

    const hours = await hoursSinceLastCustomerMessage(conversationId);

    if (hours == null) {
        return { ok: false, reason: "This person hasn't messaged you yet. WhatsApp only allows a template message to start a chat." };
    }

    if (hours >= WHATSAPP_WINDOW_HOURS) {
        return { ok: false, reason: `Their last message was ${Math.floor(hours)} hours ago. After 24 hours WhatsApp only allows a template message.` };
    }

    return { ok: true, hours };
};


const loadConversation = async (businessId, conversationId) => {

    const result = await pool.query(
        `SELECT c.id, cu.phone, b.whatsapp_phone_number_id, b.whatsapp_business_account_id
         FROM conversations c
         JOIN customers cu ON cu.id = c.customer_id
         JOIN businesses b ON b.id = c.business_id
         WHERE c.id = $1 AND c.business_id = $2`,
        [conversationId, businessId]
    );

    return result.rows[0] || null;
};


// Tell staff once an hour when the WhatsApp setup itself is broken
let lastSetupAlertAt = 0;

const alertSetupProblem = async (businessId, error) => {

    if (Date.now() - lastSetupAlertAt < 3600000) return;
    lastSetupAlertAt = Date.now();

    try {
        const { createNotification } = require("../notification/notification.service");
        await createNotification({
            businessId,
            type: "system",
            title: "⚠️ WhatsApp messages are not being sent",
            body: error.message
        });
    } catch (e) {
        console.error("Couldn't create setup alert:", e.message);
    }
};


// Save + (maybe) send. `send` does the Meta call and returns { messageId }.
const deliver = async ({ businessId, conversation, text, senderType, userId, templateName, send }) => {

    let whatsappMessageId = null;
    let deliveryStatus = "pending";
    let deliveryError = null;
    let sent = false;

    if (sendingEnabled()) {
        try {
            const result = await send();
            whatsappMessageId = result.messageId;
            deliveryStatus = "sent";
            sent = true;
        } catch (error) {
            deliveryStatus = "failed";
            deliveryError = error.message;
            console.error(`WhatsApp send failed (${error.code || "?"}): ${error.message}`);
            if (error.fatal) await alertSetupProblem(businessId, error);
        }
    }

    const { saveOutgoingMessage } = require("./whatsapp.service");

    const saved = await saveOutgoingMessage({
        businessId,
        phone: conversation.phone,
        messageText: text,
        whatsappMessageId,
        senderType,
        sentByUserId: userId
    });

    await pool.query(
        `UPDATE messages
         SET delivery_status = $1, delivery_error = $2, template_name = $3,
             status_updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [deliveryStatus, deliveryError, templateName || null, saved.message.id]
    );

    const message = { ...saved.message, delivery_status: deliveryStatus, delivery_error: deliveryError };

    console.log(
        `📤 ${senderType} message ${sent ? "SENT" : deliveryStatus === "failed" ? "FAILED" : "saved (sending disabled)"} to ${conversation.phone}: ${text}`
    );

    return deliveryStatus === "failed"
        ? { ok: false, sent: false, reason: deliveryError, message }
        : { ok: true, sent, message };
};


// Free-form text (inside the 24h window)
const sendToCustomer = async ({
    businessId,
    conversationId,
    text,
    senderType = "business",
    userId = null
}) => {

    const message = String(text || "").trim();

    if (!message) return { ok: false, reason: "Empty message" };

    const conversation = await loadConversation(businessId, conversationId);

    if (!conversation) return { ok: false, reason: "Conversation not found" };

    const window = await checkReplyWindow(conversationId);

    if (!window.ok) return { ok: false, reason: window.reason };

    const { sendText } = require("./whatsapp.sender");

    return deliver({
        businessId,
        conversation,
        text: message,
        senderType,
        userId,
        send: () => sendText({
            phoneNumberId: conversation.whatsapp_phone_number_id,
            to: conversation.phone,
            text: message
        })
    });
};


// Approved template (allowed any time, e.g. after 24h)
// preview: the text to show in the dashboard for this template
const sendTemplateToCustomer = async ({
    businessId,
    conversationId,
    name,
    language = "en",
    params = [],
    preview = null,
    senderType = "business",
    userId = null
}) => {

    if (!name) return { ok: false, reason: "Template name is required" };

    const conversation = await loadConversation(businessId, conversationId);

    if (!conversation) return { ok: false, reason: "Conversation not found" };

    const { sendTemplate } = require("./whatsapp.sender");

    return deliver({
        businessId,
        conversation,
        text: preview || `[Template: ${name}] ${params.join(" | ")}`.trim(),
        senderType,
        userId,
        templateName: name,
        send: () => sendTemplate({
            phoneNumberId: conversation.whatsapp_phone_number_id,
            to: conversation.phone,
            name,
            language,
            params
        })
    });
};


module.exports = {
    WHATSAPP_WINDOW_HOURS,
    checkReplyWindow,
    sendToCustomer,
    sendTemplateToCustomer
};
