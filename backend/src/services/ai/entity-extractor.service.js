// --------------------------------------------------
// Entity Extractor
// --------------------------------------------------

const {
    detectIntent
} = require("./intent-detector.service");


const {
    detectCourse
} = require("../knowledge/course-detector.service");


// --------------------------------------------------
// Extract Entities
// --------------------------------------------------

const extractEntities = async (
    businessId,
    message,
    conversation = []
) => {

    // --------------------------------------------------
    // 1. Detect Intent
    // --------------------------------------------------

    const intent =
        detectIntent(
            message
        );


    // --------------------------------------------------
    // 2. Detect Course
    // --------------------------------------------------

    const course =
        await detectCourse(
            businessId,
            message,
            conversation
        );


    // --------------------------------------------------
    // 3. Prepare entities
    // --------------------------------------------------

    const entities = {};


    // --------------------------------------------------
    // 4. Add Course Entity
    // --------------------------------------------------

    if (
        course &&
        !course.ambiguous
    ) {

        entities.course = {
            id: course.id,
            name: course.name
        };
    }


    // --------------------------------------------------
    // 5. Return result
    // --------------------------------------------------

    return {
        intent,
        entities
    };
};


module.exports = {
    extractEntities
};