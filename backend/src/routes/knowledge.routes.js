const express = require("express");

const {
    testCourse
} = require("../controllers/knowledge.controller");

const router = express.Router();


router.get(
    "/test-course",
    testCourse
);


module.exports = router;