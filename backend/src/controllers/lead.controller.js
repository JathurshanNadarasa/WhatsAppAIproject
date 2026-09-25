const {
    listLeads,
    getLeadStats,
    getLeadById,
    updateLead,
    upsertLeadForCustomer,
    recalculateAllLeads
} = require("../services/lead/lead.service");


const handleError = (res, error, message) => {

    console.error(`${message}:`, error.message);

    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : message
    });
};


// GET /api/leads?status=&temperature=&course=&search=&sort=score|recent|created&limit=&offset=
const getLeads = async (req, res) => {
    try {
        const leads = await listLeads(req.user.businessId, req.query);
        return res.json({ success: true, count: leads.length, leads });
    } catch (error) {
        return handleError(res, error, "Failed to get leads");
    }
};


// GET /api/leads/stats
const getStats = async (req, res) => {
    try {
        const stats = await getLeadStats(req.user.businessId);
        return res.json({ success: true, stats });
    } catch (error) {
        return handleError(res, error, "Failed to get lead stats");
    }
};


// GET /api/leads/:id
const getLead = async (req, res) => {
    try {
        const lead = await getLeadById(Number(req.params.id), req.user.businessId);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        return res.json({ success: true, lead });
    } catch (error) {
        return handleError(res, error, "Failed to get lead");
    }
};


// PATCH /api/leads/:id   body: { status?, notes?, assignedUserId? }
const patchLead = async (req, res) => {
    try {
        const lead = await updateLead(
            Number(req.params.id),
            req.user.businessId,
            req.body || {},
            req.user.userId
        );
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        return res.json({ success: true, lead });
    } catch (error) {
        return handleError(res, error, "Failed to update lead");
    }
};


// POST /api/leads/:id/recalculate
const recalculateLead = async (req, res) => {
    try {
        const existing = await getLeadById(Number(req.params.id), req.user.businessId);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        const lead = await upsertLeadForCustomer(req.user.businessId, existing.customer_id);
        return res.json({ success: true, lead });
    } catch (error) {
        return handleError(res, error, "Failed to recalculate lead");
    }
};


// POST /api/leads/recalculate-all
const recalculateAll = async (req, res) => {
    try {
        const count = await recalculateAllLeads(req.user.businessId);
        return res.json({ success: true, count });
    } catch (error) {
        return handleError(res, error, "Failed to recalculate leads");
    }
};


module.exports = {
    getLeads,
    getStats,
    getLead,
    patchLead,
    recalculateLead,
    recalculateAll
};
