const {
    getConversations,
    getConversationById,
    getConversationMessages
} = require("../services/conversation.service");

const getAllConversations = async (req, res) => {
    try {
        const businessId = req.user.businessId;

        const conversations =
            await getConversations(businessId);

        res.status(200).json({
            success: true,
            count: conversations.length,
            conversations
        });
    } catch (error) {
        console.error(
            "Get conversations error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to get conversations"
        });
    }
};

const getConversation = async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const conversationId = req.params.id;

        const conversation =
            await getConversationById(
                conversationId,
                businessId
            );

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        res.status(200).json({
            success: true,
            conversation
        });
    } catch (error) {
        console.error(
            "Get conversation error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to get conversation"
        });
    }
};

const getMessages = async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const conversationId = req.params.id;

        const conversation =
            await getConversationById(
                conversationId,
                businessId
            );

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        const messages =
            await getConversationMessages(
                conversationId,
                businessId
            );

        res.status(200).json({
            success: true,
            count: messages.length,
            messages
        });
    } catch (error) {
        console.error(
            "Get messages error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to get messages"
        });
    }
};

module.exports = {
    getAllConversations,
    getConversation,
    getMessages
};