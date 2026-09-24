const axios = require("axios");


const generateAIResponse = async (
    message,
    conversation = [],
    knowledge = null
) => {

    try {

        const response = await axios.post(
            `${process.env.AI_SERVICE_URL}/ai/chat`,
            {
                message,
                conversation,
                knowledge
            }
        );

        return response.data;

    } catch (error) {

        console.error(
            "AI Service Error:",
            error.response?.data ||
            error.message
        );

        throw new Error(
            "Failed to communicate with AI service"
        );
    }
};


module.exports = {
    generateAIResponse,
};