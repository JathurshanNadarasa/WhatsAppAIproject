const express = require("express");

const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const c = require("../controllers/user.controller");

const router = express.Router();

router.get("/", authenticate, c.list);
router.post("/", authenticate, requireAdmin, c.create);
router.patch("/:id", authenticate, requireAdmin, c.update);

module.exports = router;
