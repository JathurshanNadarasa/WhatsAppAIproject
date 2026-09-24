const express = require("express");

const {
    testIntentDetection
} = require("../controllers/intent.test.controller");


const router =
    express.Router();


router.post(
    "/test-intent",
    testIntentDetection
);


module.exports = router;