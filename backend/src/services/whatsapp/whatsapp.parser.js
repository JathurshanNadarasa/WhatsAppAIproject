const parseIncomingMessage = (body) => {
    try {
        const entry = body?.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const message = value?.messages?.[0];

        if (!message) {
            return null;
        }

        const phoneNumberId =
            value?.metadata?.phone_number_id || null;

        const phone = message.from;
        const messageId = message.id;
        const messageType = message.type;

        let messageText = null;

        if (
            messageType === "text" &&
            message.text
        ) {
            messageText = message.text.body;
        }

        return {
            phoneNumberId,
            phone,
            messageId,
            messageType,
            messageText
        };
    } catch (error) {
        console.error(
            "WhatsApp parser error:",
            error.message
        );

        return null;
    }
};

module.exports = {
    parseIncomingMessage
};