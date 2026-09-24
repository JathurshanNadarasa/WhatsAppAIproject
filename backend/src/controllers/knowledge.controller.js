const {
    getCourseByName,
    getCourses
} = require("../services/knowledge/course.service");


const {
    detectCourse
} = require("../services/knowledge/course-detector.service");


const {
    getFAQs
} = require("../services/knowledge/faq.service");

const {
    detectFAQ
} = require("../services/knowledge/faq-detector.service");

// --------------------------------------------------
// Test Course Detection
// --------------------------------------------------

const testCourseDetection = async (
    req,
    res
) => {

    try {

        const businessId = 1;

        const {
            message,
            conversation = []
        } = req.body;


        const course =
            await detectCourse(
                businessId,
                message,
                conversation
            );


        return res.json({
            success: true,
            data: course
        });

    } catch (error) {

        console.error(
            "Course Detection Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to detect course"
        });
    }
};


// --------------------------------------------------
// Test Single Course
// --------------------------------------------------

const testCourse = async (
    req,
    res
) => {

    try {

        const businessId = 1;

        const course =
            await getCourseByName(
                businessId,
                "CCNA"
            );

        return res.json({
            success: true,
            data: course
        });

    } catch (error) {

        console.error(
            "Knowledge Base Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch course"
        });
    }
};


// --------------------------------------------------
// Test All Courses
// --------------------------------------------------

const testCourses = async (
    req,
    res
) => {

    try {

        const businessId = 1;

        const courses =
            await getCourses(
                businessId
            );

        return res.json({
            success: true,
            data: courses
        });

    } catch (error) {

        console.error(
            "Knowledge Base Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch courses"
        });
    }
};


// --------------------------------------------------
// Test FAQs
// --------------------------------------------------

const testFAQs = async (
    req,
    res
) => {

    try {

        const businessId = 1;

        const faqs =
            await getFAQs(
                businessId
            );

        return res.json({
            success: true,
            data: faqs
        });

    } catch (error) {

        console.error(
            "FAQ Knowledge Base Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch FAQs"
        });
    }
};



const testFAQDetection = async (
    req,
    res
) => {

    try {

        const businessId = 1;

        const {
            message,
            conversation = []
        } = req.body;


        const faq =
            await detectFAQ(
                businessId,
                message,
                conversation
            );


        return res.json({
            success: true,
            data: faq
        });

    } catch (error) {

        console.error(
            "FAQ Detection Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to detect FAQ"
        });
    }
};
// --------------------------------------------------
// Export Controllers
// --------------------------------------------------

module.exports = {
    testCourse,
    testCourses,
    testCourseDetection,
    testFAQs,testFAQDetection
};