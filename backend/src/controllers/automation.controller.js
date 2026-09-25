const service = require("../services/automation/automation.service");
const { tick } = require("../services/automation/automation-scheduler");
const { TRIGGERS } = require("../services/automation/automation-engine");
const { VALID_OPERATORS } = require("../services/automation/conditions");
const { VALID_ACTIONS } = require("../services/automation/actions");


const wrap = (message, fn) => async (req, res) => {
    try {
        return await fn(req, res);
    } catch (error) {
        console.error(`${message}:`, error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : message
        });
    }
};

const notFound = (res) =>
    res.status(404).json({ success: false, message: "Automation not found" });


module.exports = {

    // GET /api/automations/options  (for the dashboard form)
    getOptions: wrap("Failed to get options", async (req, res) =>
        res.json({
            success: true,
            triggers: TRIGGERS,
            operators: VALID_OPERATORS,
            actions: VALID_ACTIONS
        })
    ),

    getAutomations: wrap("Failed to get automations", async (req, res) => {
        const automations = await service.listAutomations(req.user.businessId);
        return res.json({ success: true, count: automations.length, automations });
    }),

    getAutomation: wrap("Failed to get automation", async (req, res) => {
        const automation = await service.getAutomation(Number(req.params.id), req.user.businessId);
        return automation ? res.json({ success: true, automation }) : notFound(res);
    }),

    createAutomation: wrap("Failed to create automation", async (req, res) => {
        const automation = await service.createAutomation(req.user.businessId, req.body || {});
        return res.status(201).json({ success: true, automation });
    }),

    updateAutomation: wrap("Failed to update automation", async (req, res) => {
        const automation = await service.updateAutomation(Number(req.params.id), req.user.businessId, req.body || {});
        return automation ? res.json({ success: true, automation }) : notFound(res);
    }),

    deleteAutomation: wrap("Failed to delete automation", async (req, res) => {
        const deleted = await service.deleteAutomation(Number(req.params.id), req.user.businessId);
        return deleted ? res.json({ success: true }) : notFound(res);
    }),

    // GET /api/automations/runs?automationId=&status=&limit=
    getRuns: wrap("Failed to get runs", async (req, res) => {
        const runs = await service.listRuns(req.user.businessId, req.query);
        return res.json({ success: true, count: runs.length, runs });
    }),

    // POST /api/automations/tick  (run the scheduler now)
    runTick: wrap("Failed to run scheduler", async (req, res) => {
        const result = await tick();
        return res.json({ success: true, ...result });
    })
};
