// --------------------------------------------------
// WhatsApp webhook (C14)
// --------------------------------------------------
// 1. Answer Meta with 200 straight away (Meta retries
//    anything slower than ~20s and would duplicate work)
// 2. Then, in the background:
//    - delivery statuses  -> message ticks
//    - customer messages  -> one at a time per customer
// --------------------------------------------------

const { parseWebhook } = require("../services/whatsapp/whatsapp.parser");

const {
    getBusinessByPhoneNumberId,
    processIncomingMessage
} = require("../services/whatsapp/whatsapp.service");

const { sendToCustomer } = require("../services/whatsapp/outbound.service");
const { applyStatusUpdate } = require("../services/whatsapp/status.service");
const { markAsRead, sendText } = require("../services/whatsapp/whatsapp.sender");

const { refreshSummaryInBackground } = require("../services/summary/conversation-summary.service");
const { refreshLeadInBackground } = require("../services/lead/lead.service");
const { emitEvent } = require("../services/automation/automation-engine");


// --------------------------------------------------
// GET  /api/whatsapp/webhook  (Meta verification)
// --------------------------------------------------

const verifyWebhook = (req, res) => {

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log("WhatsApp webhook verified");
        return res.status(200).send(challenge);
    }

    // Never log the tokens themselves
    console.warn("WhatsApp webhook verification failed");
    return res.sendStatus(403);
};


// --------------------------------------------------
// One queue per customer so their messages are handled
// in order (and we never create two conversations)
// --------------------------------------------------

const queues = new Map();

const enqueue = (key, task) => {

    const previous = queues.get(key) || Promise.resolve();

    const next = previous
        .catch(() => undefined)
        .then(task)
        .catch((error) => console.error("WhatsApp message processing failed:", error.message))
        .finally(() => {
            if (queues.get(key) === next) queues.delete(key);
        });

    queues.set(key, next);

    return next;
};


// --------------------------------------------------
// Handle one customer message
// --------------------------------------------------

const handleIncomingMessage = async (message) => {

    const business = await getBusinessByPhoneNumberId(message.phoneNumberId);

    if (!business) {
        console.error("WhatsApp business not found for phone number ID:", message.phoneNumberId);
        return;
    }

    const result = await processIncomingMessage({
        businessId: business.id,
        phone: message.phone,
        messageId: message.messageId,
        messageType: message.messageType,
        messageText: message.messageText,
        mediaId: message.mediaId,
        mediaMimeType: message.mediaMimeType
    });

    if (result.duplicate) {
        console.log("Duplicate WhatsApp message ignored:", message.messageId);
        return;
    }

    console.log(
        `📥 ${message.phone} (${message.messageType}): ${message.messageText ?? "[no text]"} ` +
        `-> conversation ${result.conversationId}`
    );

    // Blue ticks for the customer (best effort)
    if (process.env.WHATSAPP_SENDING_ENABLED === "true" && process.env.WHATSAPP_MARK_AS_READ !== "false") {
        markAsRead({ phoneNumberId: business.whatsapp_phone_number_id, messageId: message.messageId })
            .catch((error) => console.warn("Mark as read failed:", error.message));
    }

    // Bot reply (none while staff are handling the chat)
    if (result.aiReply) {

        const sent = await sendToCustomer({
            businessId: business.id,
            conversationId: result.conversationId,
            text: result.aiReply
        });

        if (!sent.ok) {
            console.error("Bot reply not delivered:", sent.reason);
        }

    } else if (result.handover && result.handover !== "bot") {

        console.log(`Human handover (${result.handover}): message waiting for staff`);
    }

    // Background work for every message (C9-C11)
    refreshSummaryInBackground(result.conversationId, { intent: result.intent });

    refreshLeadInBackground(business.id, result.customer.id);

    emitEvent("message_received", {
        businessId: business.id,
        customerId: result.customer.id,
        conversationId: result.conversationId,
        payload: {
            intent: result.intent,
            messageText: message.messageText,
            handover: result.handover
        }
    });
};


// --------------------------------------------------
// POST /api/whatsapp/webhook
// --------------------------------------------------

const receiveWebhook = (req, res) => {

    let parsed;

    try {
        parsed = parseWebhook(req.body);
    } catch (error) {
        console.error("WhatsApp webhook parse error:", error.message);
        return res.sendStatus(200);          // bad payload: don't make Meta retry
    }

    // Acknowledge first
    res.sendStatus(200);

    const { messages, statuses } = parsed;

    for (const status of statuses) {
        applyStatusUpdate(status).catch((error) =>
            console.error("Status update failed:", error.message)
        );
    }

    for (const message of messages) {
        enqueue(`${message.phoneNumberId}:${message.phone}`, () => handleIncomingMessage(message));
    }
};


// --------------------------------------------------
// POST /api/whatsapp/send  (development test only)
// --------------------------------------------------

const sendMessage = async (req, res) => {

    if (process.env.NODE_ENV === "production") {
        return res.sendStatus(404);
    }

    try {

        const { to, message } = req.body || {};

        if (!to || !message) {
            return res.status(400).json({ success: false, message: "Recipient and message are required" });
        }

        const result = await sendText({
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
            to,
            text: message
        });

        return res.status(200).json({ success: true, whatsappMessageId: result.messageId });

    } catch (error) {

        console.error("WhatsApp send error:", error.message);

        return res.status(error.status || 500).json({
            success: false,
            message: error.message,
            code: error.code || null
        });
    }
};


module.exports = {
    verifyWebhook,
    receiveWebhook,
    sendMessage,
    // exported for tests
    handleIncomingMessage,
    enqueue
};
