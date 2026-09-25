// --------------------------------------------------
// Knowledge base admin: courses + FAQs CRUD (C13)
// The bot (C8) answers only from this data.
// --------------------------------------------------

const pool = require("../../config/database");


const badRequest = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
};

const STATUSES = ["active", "inactive"];

const clean = (value) => {
    if (value === undefined) return undefined;
    const text = String(value ?? "").trim();
    return text === "" ? null : text;
};


// ---------------- Courses ----------------

const COURSE_FIELDS = ["name", "description", "duration", "fee", "schedule", "requirements", "status"];

const normalizeCourse = (data, partial) => {

    const course = {};

    for (const field of COURSE_FIELDS) {
        if (data[field] !== undefined) course[field] = clean(data[field]);
    }

    if (!partial && !course.name) throw badRequest("Course name is required");
    if (partial && data.name !== undefined && !course.name) throw badRequest("Course name cannot be empty");

    if (course.fee !== undefined && course.fee !== null) {
        const fee = Number(String(course.fee).replace(/,/g, ""));
        if (Number.isNaN(fee) || fee < 0) throw badRequest("Fee must be a positive number");
        course.fee = fee;
    }

    if (course.status !== undefined && !STATUSES.includes(course.status)) {
        throw badRequest("Status must be active or inactive");
    }

    return course;
};


const listCourses = async (businessId) => {
    const result = await pool.query(
        `SELECT * FROM courses WHERE business_id = $1 ORDER BY status, name`,
        [businessId]
    );
    return result.rows;
};


const createCourse = async (businessId, data) => {

    const c = normalizeCourse(data, false);

    const result = await pool.query(
        `INSERT INTO courses (business_id, name, description, duration, fee, schedule, requirements, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'active'))
         RETURNING *`,
        [businessId, c.name, c.description ?? null, c.duration ?? null, c.fee ?? null,
         c.schedule ?? null, c.requirements ?? null, c.status ?? null]
    );

    return result.rows[0];
};


const updateCourse = async (businessId, id, data) => {

    const c = normalizeCourse(data, true);
    const fields = Object.keys(c);

    if (fields.length === 0) throw badRequest("Nothing to update");

    const sets = fields.map((f, i) => `${f} = $${i + 3}`);

    const result = await pool.query(
        `UPDATE courses SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
         WHERE business_id = $1 AND id = $2
         RETURNING *`,
        [businessId, id, ...fields.map(f => c[f])]
    );

    return result.rows[0] || null;
};


const deleteCourse = async (businessId, id) => {
    const result = await pool.query(
        `DELETE FROM courses WHERE business_id = $1 AND id = $2`,
        [businessId, id]
    );
    return result.rowCount > 0;
};


// ---------------- FAQs ----------------

const FAQ_FIELDS = ["question", "answer", "category", "status"];

const normalizeFaq = (data, partial) => {

    const faq = {};

    for (const field of FAQ_FIELDS) {
        if (data[field] !== undefined) faq[field] = clean(data[field]);
    }

    if (!partial && (!faq.question || !faq.answer)) throw badRequest("Question and answer are required");
    if (partial && data.question !== undefined && !faq.question) throw badRequest("Question cannot be empty");
    if (partial && data.answer !== undefined && !faq.answer) throw badRequest("Answer cannot be empty");

    if (faq.status !== undefined && !STATUSES.includes(faq.status)) {
        throw badRequest("Status must be active or inactive");
    }

    return faq;
};


const listFaqs = async (businessId) => {
    const result = await pool.query(
        `SELECT * FROM faqs WHERE business_id = $1 ORDER BY status, category NULLS LAST, id`,
        [businessId]
    );
    return result.rows;
};


const createFaq = async (businessId, data) => {

    const f = normalizeFaq(data, false);

    const result = await pool.query(
        `INSERT INTO faqs (business_id, question, answer, category, status)
         VALUES ($1, $2, $3, $4, COALESCE($5, 'active'))
         RETURNING *`,
        [businessId, f.question, f.answer, f.category ?? null, f.status ?? null]
    );

    return result.rows[0];
};


const updateFaq = async (businessId, id, data) => {

    const f = normalizeFaq(data, true);
    const fields = Object.keys(f);

    if (fields.length === 0) throw badRequest("Nothing to update");

    const sets = fields.map((field, i) => `${field} = $${i + 3}`);

    const result = await pool.query(
        `UPDATE faqs SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
         WHERE business_id = $1 AND id = $2
         RETURNING *`,
        [businessId, id, ...fields.map(field => f[field])]
    );

    return result.rows[0] || null;
};


const deleteFaq = async (businessId, id) => {
    const result = await pool.query(
        `DELETE FROM faqs WHERE business_id = $1 AND id = $2`,
        [businessId, id]
    );
    return result.rowCount > 0;
};


module.exports = {
    listCourses, createCourse, updateCourse, deleteCourse,
    listFaqs, createFaq, updateFaq, deleteFaq
};
