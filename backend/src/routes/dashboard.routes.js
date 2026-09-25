// /api/analytics/...  and  /api/kb/...   (C13, login required)

const express = require("express");

const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const c = require("../controllers/dashboard.controller");


const analytics = express.Router();
analytics.get("/overview", authenticate, c.overview);


const kb = express.Router();
kb.get("/courses", authenticate, c.listCourses);
kb.post("/courses", authenticate, requireAdmin, c.createCourse);
kb.patch("/courses/:id", authenticate, requireAdmin, c.updateCourse);
kb.delete("/courses/:id", authenticate, requireAdmin, c.deleteCourse);

kb.get("/faqs", authenticate, c.listFaqs);
kb.post("/faqs", authenticate, requireAdmin, c.createFaq);
kb.patch("/faqs/:id", authenticate, requireAdmin, c.updateFaq);
kb.delete("/faqs/:id", authenticate, requireAdmin, c.deleteFaq);


module.exports = { analytics, kb };
