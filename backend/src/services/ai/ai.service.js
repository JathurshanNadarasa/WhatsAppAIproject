const axios = require("axios");


// Used when the Python AI service is down or times out,
// so the customer still gets a polite reply.
const FALLBACK_REPLY =
    "Thanks for your message! Our team will get back to you shortly.";

const AI_TIMEOUT_MS =
    Number(process.env.AI_SERVICE_TIMEOUT_MS) || 30000;


// --------------------------------------------------
// Generate AI Response (C8)
// --------------------------------------------------
// context = {
//   business: { name },
//   customer: { first_name },
//   intent,
//   courses: [...],
//   faqs: [...]
// }
// Returns { reply, source }  source: llm | template | fallback
// --------------------------------------------------

const generateAIResponse = async (
    message,
    conversation = [],
    knowledge = null,
    context = {}
) => {

    try {

        const response = await axios.post(
            `${process.env.AI_SERVICE_URL}/ai/chat`,
            {
                message,
                conversation: conversation.map(item => ({
                    sender_type: item.sender_type,
                    message_text: item.message_text
                })),
                knowledge,
                context
            },
            {
                timeout: AI_TIMEOUT_MS
            }
        );

        return {
            reply: response.data.reply,
            source: response.data.source || "template"
        };

    } catch (error) {

        console.error(
            "AI Service Error:",
            error.response?.data ||
            error.message
        );

        return {
            reply: FALLBACK_REPLY,
            source: "fallback"
        };
    }
};


module.exports = {
    generateAIResponse,
    FALLBACK_REPLY
};
