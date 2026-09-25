const express = require("express");

const {
    testGenerateSummary,
    testGetSummary
} = require("../controllers/summary.test.controller");

const router = express.Router();

router.get("/:conversationId", testGetSummary);

router.post("/:conversationId", testGenerateSummary);

module.exports = router;
