const express = require("express");

const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const c = require("../controllers/automation.controller");


// Used by both the real router and the dev test router
// `admin` = extra middleware for changes (C15). Everyone can read.
const register = (router, middleware, admin = []) => {

    // Fixed paths BEFORE "/:id"
    router.get("/options", ...middleware, c.getOptions);
    router.get("/runs", ...middleware, c.getRuns);
    router.post("/tick", ...middleware, ...admin, c.runTick);

    router.get("/", ...middleware, c.getAutomations);
    router.post("/", ...middleware, ...admin, c.createAutomation);
    router.get("/:id", ...middleware, c.getAutomation);
    router.patch("/:id", ...middleware, ...admin, c.updateAutomation);
    router.delete("/:id", ...middleware, ...admin, c.deleteAutomation);

    return router;
};


module.exports = register(express.Router(), [authenticate], [requireAdmin]);
module.exports.register = register;
