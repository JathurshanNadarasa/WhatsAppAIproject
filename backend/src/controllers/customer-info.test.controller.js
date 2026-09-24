const {
    extractCustomerInfo
} = require("../services/ai/customer-info-extractor.service");


// --------------------------------------------------
// Test Customer Information Extraction
// --------------------------------------------------

const testCustomerInfoExtraction = (
    req,
    res
) => {

    try {

        const {
            message,
            conversation = []
        } = req.body;


        const customer =
            extractCustomerInfo(
                message,
                conversation
            );


        return res.json({

            success: true,

            data: {
                message,
                customer
            }

        });

    } catch (error) {

        console.error(
            "Customer Info Extraction Error:",
            error.message
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to extract customer information"
        });
    }
};


module.exports = {
    testCustomerInfoExtraction
};