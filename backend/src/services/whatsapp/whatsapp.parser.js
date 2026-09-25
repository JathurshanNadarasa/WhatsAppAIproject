// --------------------------------------------------
// WhatsApp webhook parser (C14)
// --------------------------------------------------
// One webhook can carry several messages and delivery
// statuses. parseWebhook() returns all of them.
// --------------------------------------------------

// Text we can read from each message type
const textOf = (message) => {

    switch (message.type) {
        case "text":
            return message.text?.body || null;
        case "image":
        case "video":
        case "document":
            return message[message.type]?.caption || null;
        case "button":
            return message.button?.text || null;
        case "interactive":
            return (
                message.interactive?.button_reply?.title ||
                message.interactive?.list_reply?.title ||
                null
            );
        case "location": {
            const l = message.location || {};
            return l.name || l.address || null;
        }
        default:
            // audio, sticker, reaction, contacts, unsupported...
            return null;
    }
};


const mediaOf = (message) => {
    const media = message[message.type];
    return media && media.id
        ? { mediaId: media.id, mediaMimeType: media.mime_type || null }
        : { mediaId: null, mediaMimeType: null };
};


const parseWebhook = (body) => {

    const messages = [];
    const statuses = [];

    if (body?.object && body.object !== "whatsapp_business_account") {
        return { messages, statuses };
    }

    for (const entry of body?.entry || []) {
        for (const change of entry.changes || []) {

            const value = change.value || {};
            const phoneNumberId = value.metadata?.phone_number_id || null;

            const names = Object.fromEntries(
                (value.contacts || []).map((c) => [c.wa_id, c.profile?.name || null])
            );

            for (const message of value.messages || []) {

                // Reactions are not conversation messages
                if (message.type === "reaction") continue;

                messages.push({
                    phoneNumberId,
                    phone: message.from,
                    profileName: names[message.from] || null,
                    messageId: message.id,
                    messageType: message.type,
                    messageText: textOf(message),
                    timestamp: message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date(),
                    ...mediaOf(message)
                });
            }

            for (const status of value.statuses || []) {
                statuses.push({
                    phoneNumberId,
                    messageId: status.id,
                    status: status.status,              // sent | delivered | read | failed
                    recipient: status.recipient_id,
                    timestamp: status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date(),
                    error: status.errors?.[0]
                        ? `${status.errors[0].code}: ${status.errors[0].error_data?.details || status.errors[0].title || status.errors[0].message}`
                        : null
                });
            }
        }
    }

    return { messages, statuses };
};


// Old API: first message only (kept for existing code/tests)
const parseIncomingMessage = (body) => {
    try {
        return parseWebhook(body).messages[0] || null;
    } catch (error) {
        console.error("WhatsApp parser error:", error.message);
        return null;
    }
};


module.exports = {
    parseWebhook,
    parseIncomingMessage
};
