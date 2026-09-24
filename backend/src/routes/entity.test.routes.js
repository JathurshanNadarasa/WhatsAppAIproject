const express = require("express");


const {
    testEntityExtraction
} = require("../controllers/entity.test.controller");


const router =
    express.Router();


router.post(
    "/test-entities",
    testEntityExtraction
);


module.exports = router;