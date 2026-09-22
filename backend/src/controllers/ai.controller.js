const {
    generateAIResponse,
} = require("../services/ai/ai.service");

const testAI = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required",
            });
        }

        const result =
            await generateAIResponse(message);

        return res.json({
            success: true,
            message: "AI service connected successfully",
            data: result,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    testAI,
};