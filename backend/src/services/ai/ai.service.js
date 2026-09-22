const axios = require("axios");

const generateAIResponse = async (message) => {
    try {
        const response = await axios.post(
            `${process.env.AI_SERVICE_URL}/ai/chat`,
            {
                message,
            }
        );

        return response.data;
    } catch (error) {
        console.error(
            "AI Service Error:",
            error.response?.data || error.message
        );

        throw new Error(
            "Failed to communicate with AI service"
        );
    }
};

module.exports = {
    generateAIResponse,
};