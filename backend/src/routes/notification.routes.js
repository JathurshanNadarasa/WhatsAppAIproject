const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const c = require("../controllers/notification.controller");


const register = (router, middleware) => {
    router.get("/", ...middleware, c.getNotifications);
    router.post("/read-all", ...middleware, c.readAll);
    router.patch("/:id/read", ...middleware, c.readNotification);
    return router;
};


module.exports = register(express.Router(), [authenticate]);
module.exports.register = register;
