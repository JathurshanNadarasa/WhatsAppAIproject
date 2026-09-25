// --------------------------------------------------
// Lead Service (C10)
// --------------------------------------------------

const pool = require("../../config/database");

const {
    calculateLeadScore
} = require("./lead-scoring");

// Lazy require: automation engine also uses this file
const emit = (trigger, event) =>
    require("../automation/automation-engine").emitEvent(trigger, event);


const STATUSES = ["new", "contacted", "qualified", "registered", "lost"];

const TEMPERATURES = ["hot", "warm", "cold"];


// --------------------------------------------------
// Event log
// --------------------------------------------------

const addLeadEvent = async (
    client,
    leadId,
    eventType,
    oldValue,
    newValue,
    userId = null
) => {

    await client.query(
        `INSERT INTO lead_events (lead_id, event_type, old_value, new_value, user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [leadId, eventType, oldValue, newValue, userId]
    );
};


// --------------------------------------------------
// Collect signals for one customer (all conversations)
// --------------------------------------------------

const collectSignals = async (businessId, customerId) => {

    const customerResult = await pool.query(
        `SELECT id, name_confirmed
         FROM customers
         WHERE id = $1 AND business_id = $2`,
        [customerId, businessId]
    );

    const customer = customerResult.rows[0];

    if (!customer) {
        return null;
    }

    const messagesResult = await pool.query(
        `SELECT m.intent, m.entities, m.created_at, m.conversation_id
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.customer_id = $1
         AND c.business_id = $2
         AND m.sender_type = 'customer'
         ORDER BY m.created_at ASC`,
        [customerId, businessId]
    );

    const messages = messagesResult.rows;

    if (messages.length === 0) {
        return null;
    }

    const intents = messages.map(m => m.intent).filter(Boolean);

    // Courses in order of last mention (latest = primary)
    const courseMap = new Map();

    for (const m of messages) {
        const course = m.entities?.course;
        if (course?.id) {
            courseMap.delete(course.id);
            courseMap.set(course.id, course.name);
        }
    }

    const summaryResult = await pool.query(
        `SELECT s.interest_level, s.interested_courses
         FROM conversation_summaries s
         JOIN conversations c ON c.id = s.conversation_id
         WHERE c.customer_id = $1 AND c.business_id = $2
         ORDER BY s.updated_at DESC
         LIMIT 1`,
        [customerId, businessId]
    );

    const summary = summaryResult.rows[0] || null;

    // Add course names the AI summary found but regex didn't
    const courseNames = [...courseMap.values()];

    for (const name of summary?.interested_courses || []) {
        if (!courseNames.includes(name)) {
            courseNames.push(name);
        }
    }

    const last = messages[messages.length - 1];

    return {
        customer,
        intents,
        courseNames,
        primaryCourseId: [...courseMap.keys()].pop() || null,
        nameShared: Boolean(customer.name_confirmed),
        customerMessageCount: messages.length,
        summaryInterest: summary?.interest_level || null,
        lastActivityAt: last.created_at,
        latestConversationId: last.conversation_id
    };
};


// --------------------------------------------------
// Create / update the lead for a customer
// --------------------------------------------------

const upsertLeadForCustomer = async (businessId, customerId) => {

    const signals = await collectSignals(businessId, customerId);

    if (!signals) {
        return null;
    }

    const { score, temperature, breakdown } = calculateLeadScore(signals);

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const existingResult = await client.query(
            `SELECT * FROM leads
             WHERE business_id = $1 AND customer_id = $2
             FOR UPDATE`,
            [businessId, customerId]
        );

        const existing = existingResult.rows[0];

        // ---------- Create ----------

        if (!existing) {

            const status = temperature === "hot" ? "qualified" : "new";

            const created = await client.query(
                `INSERT INTO leads (
                    business_id, customer_id, conversation_id, status,
                    score, temperature, score_breakdown, interested_courses,
                    primary_course_id, last_activity_at
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
                 RETURNING *`,
                [
                    businessId,
                    customerId,
                    signals.latestConversationId,
                    status,
                    score,
                    temperature,
                    JSON.stringify(breakdown),
                    JSON.stringify(signals.courseNames),
                    signals.primaryCourseId,
                    signals.lastActivityAt
                ]
            );

            const lead = created.rows[0];

            await addLeadEvent(client, lead.id, "created", null, `${status} / ${temperature} (${score})`);

            await client.query("COMMIT");

            const event = { businessId, customerId, conversationId: lead.conversation_id };

            emit("lead_created", { ...event, payload: { new: status } });

            if (temperature !== "cold") {
                emit("lead_temperature_changed", { ...event, payload: { old: null, new: temperature } });
            }

            return lead;
        }

        // ---------- Update ----------

        let status = existing.status;

        // Automatic status moves (staff decisions are never overwritten,
        // except a "lost" lead that starts talking again)
        const hasNewActivity =
            new Date(signals.lastActivityAt) > new Date(existing.last_activity_at);

        if (status === "lost" && hasNewActivity) {
            status = "new";
        }

        if (status === "new" && temperature === "hot") {
            status = "qualified";
        }

        const updated = await client.query(
            `UPDATE leads SET
                conversation_id = $1,
                status = $2,
                score = $3,
                temperature = $4,
                score_breakdown = $5::jsonb,
                interested_courses = $6::jsonb,
                primary_course_id = COALESCE($7, primary_course_id),
                last_activity_at = $8,
                status_changed_at = CASE WHEN $10::boolean THEN CURRENT_TIMESTAMP ELSE status_changed_at END,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $9
             RETURNING *`,
            [
                signals.latestConversationId,
                status,
                score,
                temperature,
                JSON.stringify(breakdown),
                JSON.stringify(signals.courseNames),
                signals.primaryCourseId,
                signals.lastActivityAt,
                existing.id,
                status !== existing.status
            ]
        );

        if (status !== existing.status) {
            await addLeadEvent(client, existing.id, "status_changed", existing.status, status);
        }

        if (temperature !== existing.temperature) {
            await addLeadEvent(client, existing.id, "temperature_changed", existing.temperature, temperature);
        }

        await client.query("COMMIT");

        const event = { businessId, customerId, conversationId: signals.latestConversationId };

        if (status !== existing.status) {
            emit("lead_status_changed", { ...event, payload: { old: existing.status, new: status } });
        }

        if (temperature !== existing.temperature) {
            emit("lead_temperature_changed", { ...event, payload: { old: existing.temperature, new: temperature } });
        }

        return updated.rows[0];

    } catch (error) {

        await client.query("ROLLBACK");
        throw error;

    } finally {

        client.release();
    }
};


// Fire-and-forget after each WhatsApp turn / summary update
const refreshLeadInBackground = (businessId, customerId) => {

    if (!businessId || !customerId) {
        return;
    }

    setImmediate(async () => {
        try {
            let lead;
            try {
                lead = await upsertLeadForCustomer(businessId, customerId);
            } catch (error) {
                // Two refreshes created the same lead at once -> retry as update
                if (error.code !== "23505") throw error;
                lead = await upsertLeadForCustomer(businessId, customerId);
            }
            if (lead) {
                console.log(
                    `Lead ${lead.id}: ${lead.status} / ${lead.temperature} (${lead.score})`
                );
            }
        } catch (error) {
            console.error("Lead refresh failed:", error.message);
        }
    });
};


// --------------------------------------------------
// Queries for the dashboard
// --------------------------------------------------

const SORTS = {
    score: "l.score DESC, l.last_activity_at DESC",
    recent: "l.last_activity_at DESC",
    created: "l.created_at DESC"
};

const listLeads = async (
    businessId,
    {
        status,
        temperature,
        course,
        search,
        sort = "score",
        limit = 50,
        offset = 0
    } = {}
) => {

    const where = ["l.business_id = $1"];
    const values = [businessId];

    const add = (sql, value) => {
        values.push(value);
        where.push(sql.split("?").join(`$${values.length}`));
    };

    if (status && STATUSES.includes(status)) add("l.status = ?", status);

    if (temperature && TEMPERATURES.includes(temperature)) add("l.temperature = ?", temperature);

    if (course) add("l.interested_courses @> ?::jsonb", JSON.stringify([course]));

    if (search) add("(cu.name ILIKE ? OR cu.phone ILIKE ?)", `%${search}%`);

    const pageLimit = Math.min(Number(limit) || 50, 200);
    const pageOffset = Math.max(Number(offset) || 0, 0);

    const result = await pool.query(
        `SELECT
            l.id, l.status, l.score, l.temperature, l.interested_courses,
            l.last_activity_at, l.created_at, l.conversation_id, l.assigned_user_id,
            cu.id AS customer_id, cu.name AS customer_name, cu.phone AS customer_phone,
            s.next_action, s.summary
         FROM leads l
         JOIN customers cu ON cu.id = l.customer_id
         LEFT JOIN conversation_summaries s ON s.conversation_id = l.conversation_id
         WHERE ${where.join(" AND ")}
         ORDER BY ${SORTS[sort] || SORTS.score}
         LIMIT ${pageLimit} OFFSET ${pageOffset}`,
        values
    );

    return result.rows;
};


const getLeadStats = async (businessId) => {

    const result = await pool.query(
        `SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE temperature = 'hot')::int AS hot,
            COUNT(*) FILTER (WHERE temperature = 'warm')::int AS warm,
            COUNT(*) FILTER (WHERE temperature = 'cold')::int AS cold,
            COUNT(*) FILTER (WHERE status = 'new')::int AS new,
            COUNT(*) FILTER (WHERE status = 'contacted')::int AS contacted,
            COUNT(*) FILTER (WHERE status = 'qualified')::int AS qualified,
            COUNT(*) FILTER (WHERE status = 'registered')::int AS registered,
            COUNT(*) FILTER (WHERE status = 'lost')::int AS lost
         FROM leads
         WHERE business_id = $1`,
        [businessId]
    );

    return result.rows[0];
};


const getLeadById = async (leadId, businessId) => {

    const leadResult = await pool.query(
        `SELECT
            l.*,
            cu.name AS customer_name,
            cu.phone AS customer_phone,
            co.name AS primary_course_name
         FROM leads l
         JOIN customers cu ON cu.id = l.customer_id
         LEFT JOIN courses co ON co.id = l.primary_course_id
         WHERE l.id = $1 AND l.business_id = $2`,
        [leadId, businessId]
    );

    const lead = leadResult.rows[0];

    if (!lead) {
        return null;
    }

    const [eventsResult, summaryResult] = await Promise.all([
        pool.query(
            `SELECT e.*, u.name AS user_name
             FROM lead_events e
             LEFT JOIN users u ON u.id = e.user_id
             WHERE e.lead_id = $1
             ORDER BY e.created_at DESC, e.id DESC
             LIMIT 50`,
            [leadId]
        ),
        pool.query(
            `SELECT * FROM conversation_summaries WHERE conversation_id = $1`,
            [lead.conversation_id]
        )
    ]);

    return {
        ...lead,
        summary: summaryResult.rows[0] || null,
        events: eventsResult.rows
    };
};


// Staff update: status, notes, assigned user
const updateLead = async (
    leadId,
    businessId,
    { status, notes, assignedUserId },
    userId = null
) => {

    if (status !== undefined && !STATUSES.includes(status)) {
        const error = new Error(`Invalid status. Use: ${STATUSES.join(", ")}`);
        error.statusCode = 400;
        throw error;
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const existingResult = await client.query(
            `SELECT * FROM leads WHERE id = $1 AND business_id = $2 FOR UPDATE`,
            [leadId, businessId]
        );

        const existing = existingResult.rows[0];

        if (!existing) {
            await client.query("ROLLBACK");
            return null;
        }

        const next = {
            status: status ?? existing.status,
            notes: notes ?? existing.notes,
            assigned_user_id: assignedUserId !== undefined ? assignedUserId : existing.assigned_user_id
        };

        const updated = await client.query(
            `UPDATE leads SET
                status = $1,
                notes = $2,
                assigned_user_id = $3,
                status_changed_at = CASE WHEN $5::boolean THEN CURRENT_TIMESTAMP ELSE status_changed_at END,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [next.status, next.notes, next.assigned_user_id, leadId, next.status !== existing.status]
        );

        if (next.status !== existing.status) {
            await addLeadEvent(client, leadId, "status_changed", existing.status, next.status, userId);
        }

        if (notes !== undefined && notes !== existing.notes) {
            await addLeadEvent(client, leadId, "note_added", null, notes, userId);
        }

        await client.query("COMMIT");

        if (next.status !== existing.status) {
            emit("lead_status_changed", {
                businessId,
                customerId: existing.customer_id,
                conversationId: existing.conversation_id,
                payload: { old: existing.status, new: next.status, userId }
            });
        }

        return updated.rows[0];

    } catch (error) {

        await client.query("ROLLBACK");
        throw error;

    } finally {

        client.release();
    }
};


// Build/refresh leads for every customer of a business
// (use once after installing C10, or from the dashboard)
const recalculateAllLeads = async (businessId) => {

    const customers = await pool.query(
        `SELECT DISTINCT c.customer_id
         FROM conversations c
         WHERE c.business_id = $1`,
        [businessId]
    );

    let count = 0;

    for (const row of customers.rows) {
        const lead = await upsertLeadForCustomer(businessId, row.customer_id);
        if (lead) count++;
    }

    return count;
};


module.exports = {
    recalculateAllLeads,
    STATUSES,
    TEMPERATURES,
    upsertLeadForCustomer,
    refreshLeadInBackground,
    listLeads,
    getLeadStats,
    getLeadById,
    updateLead
};
