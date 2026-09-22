const express = require("express");

const {
    verifyWebhook,
    receiveWebhook,
    sendMessage
} = require("../controllers/whatsapp.controller");

const router = express.Router();

router.get(
    "/webhook",
    verifyWebhook
);

router.post(
    "/webhook",
    receiveWebhook
);

router.post(
    "/send", sendMessage
);
module.exports = router;