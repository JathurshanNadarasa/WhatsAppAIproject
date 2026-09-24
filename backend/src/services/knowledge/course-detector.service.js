

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
    // 2. Prepare current message
    // --------------------------------------------------

    const currentMessage =
        message || "";

    const currentText =
        currentMessage
            .toLowerCase()
            .trim();


    // --------------------------------------------------
    // 3. Exact course name match in current message
    // --------------------------------------------------

    const exactCurrentMatches =
        courses.filter(
            course => {

                const courseName =
                    course.name
                        .toLowerCase()
                        .trim();

                return currentText.includes(
                    courseName
                );
            }
        );


    // --------------------------------------------------
    // 4. Exact current-message match
    // --------------------------------------------------

    if (
        exactCurrentMatches.length === 1
    ) {

        return exactCurrentMatches[0];
    }


    // --------------------------------------------------
    // 5. Multiple exact current-message matches
    // --------------------------------------------------

    if (
        exactCurrentMatches.length > 1
    ) {

        return {
            ambiguous: true,
            courses: exactCurrentMatches
        };
    }


    // --------------------------------------------------
    // 6. Build conversation text
    // --------------------------------------------------

    const conversationText =
        conversation
            .map(
                item =>
                    item.message_text || ""
            )
            .join(" ");


    const searchText =
        `${currentText} ${conversationText}`
            .toLowerCase()
            .trim();


    // --------------------------------------------------
    // 7. Exact course name match using conversation
    // --------------------------------------------------

    const exactMatches =
        courses.filter(
            course => {

                const courseName =
                    course.name
                        .toLowerCase()
                        .trim();

                return searchText.includes(
                    courseName
                );
            }
        );


    // --------------------------------------------------
    // 8. If exactly one exact match
    // --------------------------------------------------

    if (
        exactMatches.length === 1
    ) {

        return exactMatches[0];
    }


    // --------------------------------------------------
    // 9. If multiple exact matches
    // --------------------------------------------------

    if (
        exactMatches.length > 1
    ) {

        return {
            ambiguous: true,
            courses: exactMatches
        };
    }


    // --------------------------------------------------
    // 10. Partial / keyword matches
    // --------------------------------------------------

    const partialMatches =
        courses.filter(
            course => {

                const courseName =
                    course.name
                        .toLowerCase()
                        .trim();

                const courseWords =
                    courseName
                        .split(/\s+/)
                        .filter(
                            word =>
                                word.length >= 3
                        );

                return courseWords.some(
                    word =>
                        searchText.includes(word)
                );
            }
        );


    // --------------------------------------------------
    // 11. If exactly one partial match
    // --------------------------------------------------

    if (
        partialMatches.length === 1
    ) {

        return partialMatches[0];
    }


    // --------------------------------------------------
    // 12. If multiple partial matches
    // --------------------------------------------------

    if (
        partialMatches.length > 1
    ) {

        return {
            ambiguous: true,
            courses: partialMatches
        };
    }


    // --------------------------------------------------
    // 13. No course found
    // --------------------------------------------------

    return null;
};


module.exports = {
    detectCourse
};