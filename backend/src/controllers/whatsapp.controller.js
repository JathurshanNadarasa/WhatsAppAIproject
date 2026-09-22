const {
    parseIncomingMessage
} = require("../services/whatsapp/whatsapp.parser");

const {
     getBusinessByPhoneNumberId,
    processIncomingMessage,
    saveOutgoingMessage
} = require("../services/whatsapp/whatsapp.service");


const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    console.log('Mode:', mode)
    console.log('Token received:', token)
    console.log('Token from ENV:', process.env.WHATSAPP_VERIFY_TOKEN)
    console.log('Challenge:', challenge)

    if (
        mode === 'subscribe' &&
        token === process.env.WHATSAPP_VERIFY_TOKEN
    ) {
        console.log('WhatsApp Webhook verified')

        return res.status(200).send(challenge)
    }

    console.log('WhatsApp Webhook verification failed')

    return res.sendStatus(403)
}
const receiveWebhook = async (req, res) => {
    try {
        console.log("WhatsApp webhook received:");

        const message = parseIncomingMessage(req.body);

        if (!message) {
            console.log(
                "No incoming WhatsApp message found"
            );

            return res.sendStatus(200);
        }

        console.log(
            "Incoming WhatsApp message:",
            message
        );

        const business =
            await getBusinessByPhoneNumberId(
                message.phoneNumberId
            );

        if (!business) {
            console.error(
                "WhatsApp business not found for phone number ID:",
                message.phoneNumberId
            );

            return res.sendStatus(200);
        }

        console.log(
            "WhatsApp business identified:",
            business
        );

        const result =
            await processIncomingMessage({
                businessId: business.id,
                phone: message.phone,
                messageId: message.messageId,
                messageType: message.messageType,
                messageText: message.messageText
            });

        if (result.duplicate) {
            console.log(
                "Duplicate WhatsApp message ignored:",
                result.messageId
            );

            return res.sendStatus(200);
        }

        console.log(
            "WhatsApp message saved successfully"
        );

        console.log(
            "Customer:",
            result.customer
        );

        console.log(
            "Conversation ID:",
            result.conversationId
        );

        console.log(
            "Message:",
            result.message
        );

        return res.sendStatus(200);

    } catch (error) {
        console.error(
            "WhatsApp webhook error:",
            error.message
        );

        return res.sendStatus(500);
    }
};

const {
    sendWhatsAppMessage
} = require("../services/whatsapp/whatsapp.sender");

const sendMessage = async (req, res) => {
    try {
        const {
            to,
            message
        } = req.body;

        if (!to || !message) {
            return res.status(400).json({
                success: false,
                message: "Recipient and message are required"
            });
        }

        const businessId = 1;

        const result = await sendWhatsAppMessage({
            phoneNumberId:
                process.env.WHATSAPP_PHONE_NUMBER_ID,

            accessToken:
                process.env.WHATSAPP_ACCESS_TOKEN,

            to,
            message
        });

        const whatsappMessageId =
            result.messages?.[0]?.id;

        const savedMessage =
            await saveOutgoingMessage({
                businessId,
                phone: to,
                messageText: message,
                whatsappMessageId
            });

        return res.status(200).json({
            success: true,
            message: "WhatsApp message sent and saved successfully",
            data: {
                whatsapp: result,
                database: savedMessage
            }
        });

    } catch (error) {
        console.error(
            "WhatsApp send error:",
            error.response?.data ||
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to send WhatsApp message",
            error:
                error.response?.data ||
                error.message
        });
    }
};
module.exports = {
    verifyWebhook,
    receiveWebhook,
    sendMessage
};