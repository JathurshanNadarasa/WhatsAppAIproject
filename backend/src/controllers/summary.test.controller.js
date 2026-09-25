// Development-only summary endpoints (no login needed).
// Disabled when NODE_ENV=production.

const {
    generateSummary
} = require("../services/summary/conversation-summary.service");

const pool = require("../config/database");


const testGenerateSummary = async (req, res) => {

    if (process.env.NODE_ENV === "production") {
        return res.sendStatus(404);
    }

    try {

        const summary = await generateSummary(Number(req.params.conversationId));

        return res.json({ success: true, summary });

    } catch (error) {

        console.error("Test summary error:", error.response?.data || error.message);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const testGetSummary = async (req, res) => {

    if (process.env.NODE_ENV === "production") {
        return res.sendStatus(404);
    }

    const result = await pool.query(
        `SELECT * FROM conversation_summaries WHERE conversation_id = $1`,
        [Number(req.params.conversationId)]
    );

    return res.json({ success: true, summary: result.rows[0] || null });
};


module.exports = {
    testGenerateSummary,
    testGetSummary
};
