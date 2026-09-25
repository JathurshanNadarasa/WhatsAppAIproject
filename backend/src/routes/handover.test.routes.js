// --------------------------------------------------
// Development-only handover endpoints (no login).
// Acts as the first staff user of the business, or ?userId=
// ?businessId= (default 1). Disabled when NODE_ENV=production.
// --------------------------------------------------

const express = require("express");

const pool = require("../config/database");
const { register } = require("./handover.routes");


const devStaff = async (req, res, next) => {

    if (process.env.NODE_ENV === "production") {
        return res.sendStatus(404);
    }

    const businessId = Number(req.query.businessId) || 1;

    let userId = Number(req.query.userId) || null;

    if (!userId) {
        const result = await pool.query(
            `SELECT id FROM users WHERE business_id = $1 ORDER BY id LIMIT 1`,
            [businessId]
        );
        userId = result.rows[0]?.id || null;
    }

    req.user = { userId, businessId, role: req.query.role === "staff" ? "staff" : "admin" };

    next();
};


module.exports = register(express.Router(), [devStaff]);
