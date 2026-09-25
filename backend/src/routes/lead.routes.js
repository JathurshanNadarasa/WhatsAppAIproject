const express = require("express");

const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

const {
    getLeads,
    getStats,
    getLead,
    patchLead,
    recalculateLead,
    recalculateAll
} = require("../controllers/lead.controller");

const router = express.Router();

// Fixed paths BEFORE "/:id"
router.get("/", authenticate, getLeads);
router.get("/stats", authenticate, getStats);
router.post("/recalculate-all", authenticate, requireAdmin, recalculateAll);

router.get("/:id", authenticate, getLead);
router.patch("/:id", authenticate, patchLead);
router.post("/:id/recalculate", authenticate, recalculateLead);

module.exports = router;
