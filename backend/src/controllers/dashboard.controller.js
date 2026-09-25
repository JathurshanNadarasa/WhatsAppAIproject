// Analytics + knowledge base admin (C13)

const { getOverview } = require("../services/analytics/analytics.service");
const kb = require("../services/knowledge/kb-admin.service");


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

const notFound = (res, what) =>
    res.status(404).json({ success: false, message: `${what} not found` });

const biz = (req) => req.user.businessId;
const id = (req) => Number(req.params.id);


module.exports = {

    // GET /api/analytics/overview?days=14
    overview: wrap("Failed to load analytics", async (req, res) =>
        res.json({ success: true, ...(await getOverview(biz(req), req.query.days)) })
    ),

    listCourses: wrap("Failed to load courses", async (req, res) =>
        res.json({ success: true, courses: await kb.listCourses(biz(req)) })
    ),
    createCourse: wrap("Failed to create course", async (req, res) =>
        res.status(201).json({ success: true, course: await kb.createCourse(biz(req), req.body || {}) })
    ),
    updateCourse: wrap("Failed to update course", async (req, res) => {
        const course = await kb.updateCourse(biz(req), id(req), req.body || {});
        return course ? res.json({ success: true, course }) : notFound(res, "Course");
    }),
    deleteCourse: wrap("Failed to delete course", async (req, res) =>
        (await kb.deleteCourse(biz(req), id(req))) ? res.json({ success: true }) : notFound(res, "Course")
    ),

    listFaqs: wrap("Failed to load FAQs", async (req, res) =>
        res.json({ success: true, faqs: await kb.listFaqs(biz(req)) })
    ),
    createFaq: wrap("Failed to create FAQ", async (req, res) =>
        res.status(201).json({ success: true, faq: await kb.createFaq(biz(req), req.body || {}) })
    ),
    updateFaq: wrap("Failed to update FAQ", async (req, res) => {
        const faq = await kb.updateFaq(biz(req), id(req), req.body || {});
        return faq ? res.json({ success: true, faq }) : notFound(res, "FAQ");
    }),
    deleteFaq: wrap("Failed to delete FAQ", async (req, res) =>
        (await kb.deleteFaq(biz(req), id(req))) ? res.json({ success: true }) : notFound(res, "FAQ")
    )
};
