// CRUD for automations (C11)

const pool = require("../../config/database");

const { TRIGGERS } = require("./automation-engine");
const { VALID_OPERATORS } = require("./conditions");
const { VALID_ACTIONS } = require("./actions");


const badRequest = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
};


const validate = (data, partial = false) => {

    if (!partial || data.name !== undefined) {
        if (!data.name || !String(data.name).trim()) throw badRequest("name is required");
    }

    if (!partial || data.trigger_type !== undefined) {
        if (!TRIGGERS.includes(data.trigger_type)) {
            throw badRequest(`trigger_type must be one of: ${TRIGGERS.join(", ")}`);
        }
    }

    if (data.conditions !== undefined) {
        if (!Array.isArray(data.conditions)) throw badRequest("conditions must be an array");
        for (const c of data.conditions) {
            if (!c.field || !VALID_OPERATORS.includes(c.op)) {
                throw badRequest(`Each condition needs field and op (${VALID_OPERATORS.join(", ")})`);
            }
        }
    }

    if (!partial || data.actions !== undefined) {
        if (!Array.isArray(data.actions) || data.actions.length === 0) {
            throw badRequest("actions must be a non-empty array");
        }
        for (const a of data.actions) {
            if (!VALID_ACTIONS.includes(a.type)) {
                throw badRequest(`Action type must be one of: ${VALID_ACTIONS.join(", ")}`);
            }
        }
    }
};


const listAutomations = async (businessId) => {

    const result = await pool.query(
        `SELECT a.*,
            (SELECT COUNT(*)::int FROM automation_runs r
             WHERE r.automation_id = a.id AND r.status = 'success') AS success_count,
            (SELECT MAX(r.executed_at) FROM automation_runs r
             WHERE r.automation_id = a.id) AS last_run_at
         FROM automations a
         WHERE a.business_id = $1
         ORDER BY a.id`,
        [businessId]
    );

    return result.rows;
};


const getAutomation = async (id, businessId) => {

    const result = await pool.query(
        `SELECT * FROM automations WHERE id = $1 AND business_id = $2`,
        [id, businessId]
    );

    return result.rows[0] || null;
};


const createAutomation = async (businessId, data) => {

    validate(data);

    try {

        const result = await pool.query(
            `INSERT INTO automations
                (business_id, name, description, is_active, trigger_type,
                 conditions, actions, delay_minutes, cooldown_minutes)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
             RETURNING *`,
            [
                businessId,
                String(data.name).trim(),
                data.description || null,
                data.is_active !== false,
                data.trigger_type,
                JSON.stringify(data.conditions || []),
                JSON.stringify(data.actions),
                Number(data.delay_minutes) || 0,
                Number(data.cooldown_minutes) || 0
            ]
        );

        return result.rows[0];

    } catch (error) {
        if (error.code === "23505") throw badRequest("An automation with this name already exists");
        throw error;
    }
};


const updateAutomation = async (id, businessId, data) => {

    validate(data, true);

    const existing = await getAutomation(id, businessId);

    if (!existing) return null;

    const next = { ...existing, ...data };

    const result = await pool.query(
        `UPDATE automations SET
            name = $1, description = $2, is_active = $3, trigger_type = $4,
            conditions = $5::jsonb, actions = $6::jsonb,
            delay_minutes = $7, cooldown_minutes = $8,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 AND business_id = $10
         RETURNING *`,
        [
            next.name,
            next.description,
            Boolean(next.is_active),
            next.trigger_type,
            JSON.stringify(next.conditions || []),
            JSON.stringify(next.actions || []),
            Number(next.delay_minutes) || 0,
            Number(next.cooldown_minutes) || 0,
            id,
            businessId
        ]
    );

    return result.rows[0];
};


const deleteAutomation = async (id, businessId) => {

    const result = await pool.query(
        `DELETE FROM automations WHERE id = $1 AND business_id = $2`,
        [id, businessId]
    );

    return result.rowCount > 0;
};


const listRuns = async (businessId, { automationId, status, limit = 50 } = {}) => {

    const where = ["r.business_id = $1"];
    const values = [businessId];

    if (automationId) {
        values.push(Number(automationId));
        where.push(`r.automation_id = $${values.length}`);
    }

    if (status) {
        values.push(status);
        where.push(`r.status = $${values.length}`);
    }

    values.push(Math.min(Number(limit) || 50, 200));

    const result = await pool.query(
        `SELECT r.*, a.name AS automation_name, cu.name AS customer_name, cu.phone AS customer_phone
         FROM automation_runs r
         JOIN automations a ON a.id = r.automation_id
         LEFT JOIN customers cu ON cu.id = r.customer_id
         WHERE ${where.join(" AND ")}
         ORDER BY r.created_at DESC, r.id DESC
         LIMIT $${values.length}`,
        values
    );

    return result.rows;
};


module.exports = {
    listAutomations,
    getAutomation,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    listRuns
};
