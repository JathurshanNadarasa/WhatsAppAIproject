const {
    listNotifications,
    markRead,
    markAllRead
} = require("../services/notification/notification.service");


const fail = (res, error, message) => {
    console.error(`${message}:`, error.message);
    return res.status(500).json({ success: false, message });
};


module.exports = {

    // GET /api/notifications?unread=true&limit=
    getNotifications: async (req, res) => {
        try {
            const data = await listNotifications(req.user.businessId, req.user.userId, {
                unreadOnly: req.query.unread === "true",
                limit: req.query.limit
            });
            return res.json({ success: true, ...data });
        } catch (error) {
            return fail(res, error, "Failed to get notifications");
        }
    },

    // PATCH /api/notifications/:id/read
    readNotification: async (req, res) => {
        try {
            const notification = await markRead(req.user.businessId, Number(req.params.id));
            if (!notification) {
                return res.status(404).json({ success: false, message: "Notification not found" });
            }
            return res.json({ success: true, notification });
        } catch (error) {
            return fail(res, error, "Failed to update notification");
        }
    },

    // POST /api/notifications/read-all
    readAll: async (req, res) => {
        try {
            const count = await markAllRead(req.user.businessId, req.user.userId);
            return res.json({ success: true, count });
        } catch (error) {
            return fail(res, error, "Failed to update notifications");
        }
    }
};
