const {
    getConversationById
} = require("../services/conversation.service");

const {
    getSummary,
    generateSummary
} = require("../services/summary/conversation-summary.service");


// GET /api/conversations/:id/summary
const getConversationSummary = async (req, res) => {

    try {

        const businessId = req.user.businessId;
        const conversationId = Number(req.params.id);

        const conversation = await getConversationById(conversationId, businessId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        const summary = await getSummary(conversationId, businessId);

        return res.status(200).json({
            success: true,
            summary
        });

    } catch (error) {

        console.error("Get summary error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to get summary"
        });
    }
};


// POST /api/conversations/:id/summary  (regenerate now)
const regenerateConversationSummary = async (req, res) => {

    try {

        const businessId = req.user.businessId;
        const conversationId = Number(req.params.id);

        const conversation = await getConversationById(conversationId, businessId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        const summary = await generateSummary(conversationId);

        return res.status(200).json({
            success: true,
            summary
        });

    } catch (error) {

        console.error(
            "Generate summary error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to generate summary"
        });
    }
};


module.exports = {
    getConversationSummary,
    regenerateConversationSummary
};
