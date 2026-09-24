
const {
    getCourses
} = require("./course.service");


const detectCourse = async (
    businessId,
    message,
    conversation = []
) => {

    // --------------------------------------------------
    // 1. Get all active courses
    // --------------------------------------------------

    const courses =
        await getCourses(
            businessId
        );


    // --------------------------------------------------
    // 2. Create text from current message
    //    + conversation history
    // --------------------------------------------------

    const currentMessage =
        message || "";

    const conversationText =
        conversation
            .map(
                item => item.message_text || ""
            )
            .join(" ");


    const searchText =
        `${currentMessage} ${conversationText}`
            .toLowerCase();


    // --------------------------------------------------
    // 3. Sort courses by name length
    //    Longest name first
    // --------------------------------------------------

    const sortedCourses =
        [...courses].sort(
            (a, b) =>
                b.name.length -
                a.name.length
        );


    // --------------------------------------------------
    // 4. Find matching course
    // --------------------------------------------------

    const matchedCourse =
        sortedCourses.find(
            course =>
                searchText.includes(
                    course.name.toLowerCase()
                )
        );


    // --------------------------------------------------
    // 5. Return matched course
    // --------------------------------------------------

    return matchedCourse || null;
};


module.exports = {
    detectCourse
};
