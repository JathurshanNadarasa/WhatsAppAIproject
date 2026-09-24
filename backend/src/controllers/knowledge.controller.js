
const {
    getCourseByName,
    getCourses
} = require("../services/knowledge/course.service");
const {
    detectCourse
} = require("../services/knowledge/course-detector.service");
const testCourseDetection = async (req, res) => {

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



const testCourse = async (req, res) => {

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


const testCourses = async (req, res) => {

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


module.exports = {
    testCourse,
    testCourses,
    testCourseDetection
};

