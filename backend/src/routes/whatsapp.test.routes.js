const express = require("express");

const {
    testIncomingMessage
} = require("../controllers/whatsapp.test.controller");

const router = express.Router();

router.post(
    "/test-message",
    testIncomingMessage
);

module.exports = router;