// --------------------------------------------------
// Development-only (no login): automations + notifications
//   /api/automation-test/...     same as /api/automations/...
//   /api/automation-test/notifications/...
// ?businessId= (default 1). Disabled when NODE_ENV=production.
// --------------------------------------------------

const express = require("express");

const { register: registerAutomations } = require("./automation.routes");
const { register: registerNotifications } = require("./notification.routes");


const devUser = (req, res, next) => {

    if (process.env.NODE_ENV === "production") {
        return res.sendStatus(404);
    }

    req.user = {
        userId: null,
        businessId: Number(req.query.businessId) || 1,
        role: "admin"
    };

    next();
};


const router = express.Router();

router.use("/notifications", registerNotifications(express.Router(), [devUser]));

registerAutomations(router, [devUser]);

module.exports = router;
