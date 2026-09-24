const express = require("express");

const {
    testCourse,
    testCourses,
    testCourseDetection,
    testFAQs,
    testFAQDetection
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
router.get(
    "/test-faqs",
    testFAQs
);
router.post(
    "/test-faq-detection",
    testFAQDetection
);

module.exports = router;