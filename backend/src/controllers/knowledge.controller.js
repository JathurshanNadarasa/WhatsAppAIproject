const {
    getCourseByName
} = require("../services/knowledge/course.service");


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


module.exports = {
    testCourse
};