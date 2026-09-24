const {
    detectIntent
} = require("../services/ai/intent-detector.service");


const testIntentDetection = (
    req,
    res
) => {

    try {

        const {
            message
        } = req.body;


        const intent =
            detectIntent(
                message
            );


        return res.json({
            success: true,
            data: {
                message,
                intent
            }
        });

    } catch (error) {

        console.error(
            "Intent Detection Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to detect intent"
        });
    }
};


module.exports = {
    testIntentDetection
};