const service = require("../services/handover/handover.service");


const wrap = (message, fn) => async (req, res) => {
    try {
        return await fn(req, res);
    } catch (error) {
        console.error(`${message}:`, error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : message
        });
    }
};

const ids = (req) => ({
    businessId: req.user.businessId,
    conversationId: Number(req.params.conversationId),
    userId: req.user.userId || null
});


module.exports = {

    // GET /api/handover/templates  (approved WhatsApp templates)
    getTemplates: wrap("Failed to load templates", async (req, res) => {
        const templates = await service.listApprovedTemplates(req.user.businessId);
        return res.json({ success: true, templates });
    }),

    // POST /api/handover/:conversationId/template  { name, language, params, preview }
    sendTemplate: wrap("Failed to send template", async (req, res) => {
        const result = await service.staffSendTemplate({ ...ids(req), ...(req.body || {}) });
        return res.json({ success: true, sent: result.sent, message: result.message });
    }),

    // GET /api/handover/queue?status=pending|human
    getQueue: wrap("Failed to get handover queue", async (req, res) => {
        const queue = await service.getHandoverQueue(req.user.businessId, req.query);
        return res.json({ success: true, count: queue.length, queue });
    }),

    // GET /api/handover/:conversationId/events
    getEvents: wrap("Failed to get handover history", async (req, res) => {
        const { businessId, conversationId } = ids(req);
        const events = await service.getHandoverEvents(conversationId, businessId);
        return res.json({ success: true, events });
    }),

    // POST /api/handover/:conversationId/request   { reason }
    request: wrap("Failed to request handover", async (req, res) => {
        const conversation = await service.requestHandover({
            ...ids(req),
            reason: req.body?.reason || "Requested by staff"
        });
        return res.json({ success: true, conversation });
    }),

    // POST /api/handover/:conversationId/accept
    accept: wrap("Failed to accept handover", async (req, res) => {
        const conversation = await service.acceptHandover(ids(req));
        return res.json({ success: true, conversation });
    }),

    // POST /api/handover/:conversationId/assign   { userId }
    assign: wrap("Failed to assign conversation", async (req, res) => {
        const targetUserId = Number(req.body?.userId) || null;

        // C15: staff may only take a chat for themselves
        if (req.user.role !== "admin" && targetUserId !== req.user.userId) {
            return res.status(403).json({ success: false, message: "Only admins can assign chats to other people." });
        }

        const conversation = await service.assignHandover({
            ...ids(req),
            targetUserId
        });
        return res.json({ success: true, conversation });
    }),

    // POST /api/handover/:conversationId/reply   { text }
    reply: wrap("Failed to send reply", async (req, res) => {
        const result = await service.staffReply({ ...ids(req), text: req.body?.text });
        return res.json({ success: true, sent: result.sent, message: result.message });
    }),

    // POST /api/handover/:conversationId/release   { sendMessage?: true }
    release: wrap("Failed to release conversation", async (req, res) => {
        const result = await service.releaseHandover({
            ...ids(req),
            sendMessage: req.body?.sendMessage !== false
        });
        return res.json({
            success: true,
            conversation: result.conversation,
            message: result.message
        });
    })
};
