const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const c = require("../controllers/handover.controller");


const register = (router, middleware) => {

    router.get("/queue", ...middleware, c.getQueue);
    router.get("/templates", ...middleware, c.getTemplates);

    router.get("/:conversationId/events", ...middleware, c.getEvents);
    router.post("/:conversationId/request", ...middleware, c.request);
    router.post("/:conversationId/accept", ...middleware, c.accept);
    router.post("/:conversationId/assign", ...middleware, c.assign);
    router.post("/:conversationId/reply", ...middleware, c.reply);
    router.post("/:conversationId/release", ...middleware, c.release);
    router.post("/:conversationId/template", ...middleware, c.sendTemplate);

    return router;
};


module.exports = register(express.Router(), [authenticate]);
module.exports.register = register;
