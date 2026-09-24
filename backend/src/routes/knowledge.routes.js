const express = require("express");

const {
    testCourse,
    testCourses,
    testCourseDetection
} = require("../controllers/knowledge.controller");

const router = express.Router();


router.get(
    "/test-course",
    testCourse
);
router.get(
    "/test-courses",
    testCourses
);

router.post( "/test-course-detection", testCourseDetection );


module.exports = router;