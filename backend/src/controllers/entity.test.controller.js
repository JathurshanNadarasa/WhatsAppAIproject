const {
    extractEntities
} = require("../services/ai/entity-extractor.service");


// --------------------------------------------------
// Test Entity Extraction
// --------------------------------------------------

const testEntityExtraction = async (
    req,
    res
) => {

    try {

        const {
            businessId,
            message,
            conversation = []
        } = req.body;


        const result =
            await extractEntities(
                businessId,
                message,
                conversation
            );


        return res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Entity Extraction Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to extract entities"
        });
    }
};


module.exports = {
    testEntityExtraction
};