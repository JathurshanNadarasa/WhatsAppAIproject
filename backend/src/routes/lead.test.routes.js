// --------------------------------------------------
// Development-only lead endpoints (no login needed).
// Same controllers as /api/leads, with a fake user for
// business ?businessId= (default 1).
// Disabled when NODE_ENV=production.
// --------------------------------------------------

const express = require("express");

const {
    getLeads,
    getStats,
    getLead,
    patchLead,
    recalculateLead,
    recalculateAll
} = require("../controllers/lead.controller");

const router = express.Router();

router.use((req, res, next) => {

    if (process.env.NODE_ENV === "production") {
        return res.sendStatus(404);
    }

    req.user = {
        userId: null,
        businessId: Number(req.query.businessId) || 1,
        role: "admin"
    };

    next();
});

router.get("/", getLeads);
router.get("/stats", getStats);
router.post("/recalculate-all", recalculateAll);
router.get("/:id", getLead);
router.patch("/:id", patchLead);
router.post("/:id/recalculate", recalculateLead);

module.exports = router;
