const express = require("express");

const {
    getAllConversations,
    getConversation,
    getMessages
} = require("../controllers/conversation.controller");

const {
    getConversationSummary,
    regenerateConversationSummary
} = require("../controllers/summary.controller");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.get(
    "/",
    authenticate,
    getAllConversations
);

router.get(
    "/:id",
    authenticate,
    getConversation
);

router.get(
    "/:id/messages",
    authenticate,
    getMessages
);

router.get(
    "/:id/summary",
    authenticate,
    getConversationSummary
);
router.post(
    "/:id/summary",
    authenticate,
    regenerateConversationSummary
);
module.exports = router;