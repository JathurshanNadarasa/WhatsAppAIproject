const {
    processIncomingMessage
} = require("../services/whatsapp/whatsapp.service");

const testIncomingMessage = async (req, res) => {

    try {

        const {
            businessId,
            phone,
            messageText
        } = req.body;

        const result =
            await processIncomingMessage({
                businessId,
                phone,
                messageId: `test-${Date.now()}`,
                messageType: "text",
                messageText
            });

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Test message error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    testIncomingMessage
};