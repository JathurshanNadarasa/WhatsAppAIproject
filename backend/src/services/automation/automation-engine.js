// --------------------------------------------------
// Automation Engine (C11)
// --------------------------------------------------
// emitEvent(trigger, {...})   called from WhatsApp / lead / summary code
//   -> finds active automations for that trigger
//   -> cooldown check -> conditions -> run now or schedule
// processDueRuns()            runs delayed automations (scheduler)
// scanInactiveConversations() fires "customer_inactive" (scheduler)
// --------------------------------------------------

const pool = require("../../config/database");

const { buildContext } = require("./context");
const { evaluateConditions } = require("./conditions");
const { ACTIONS } = require("./actions");


const TRIGGERS = [
    "message_received",
    "lead_created",
    "lead_temperature_changed",
    "lead_status_changed",
    "summary_updated",
    "customer_inactive",
    "handover_requested"
];


// --------------------------------------------------
// Cooldown
// --------------------------------------------------

const isInCooldown = async (automation, customerId, conversationId) => {

    if (automation.cooldown_minutes === 0) {
        return false;
    }

    // -1 = only once per conversation. "skipped" counts too, so a
    // follow-up blocked by the 24h window is not retried every tick.
    if (automation.cooldown_minutes < 0) {

        if (!conversationId) return false;

        const result = await pool.query(
            `SELECT 1 FROM automation_runs
             WHERE automation_id = $1
             AND conversation_id = $2
             AND status IN ('scheduled', 'running', 'success', 'skipped')
             LIMIT 1`,
            [automation.id, conversationId]
        );

        return result.rows.length > 0;
    }

    const result = await pool.query(
        `SELECT 1 FROM automation_runs
         WHERE automation_id = $1
         AND customer_id = $2
         AND status IN ('scheduled', 'running', 'success')
         AND created_at > NOW() - ($3 || ' minutes')::interval
         LIMIT 1`,
        [automation.id, customerId, String(automation.cooldown_minutes)]
    );

    return result.rows.length > 0;
};


// --------------------------------------------------
// Execute one run (actions in order)
// --------------------------------------------------

const executeRun = async (runId) => {

    const runResult = await pool.query(
        `SELECT r.*, row_to_json(a) AS automation
         FROM automation_runs r
         JOIN automations a ON a.id = r.automation_id
         WHERE r.id = $1`,
        [runId]
    );

    const run = runResult.rows[0];

    if (!run) return null;

    const automation = run.automation;

    const finish = async (status, result, error = null) => {
        await pool.query(
            `UPDATE automation_runs
             SET status = $1, result = $2::jsonb, error = $3, executed_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [status, JSON.stringify(result || {}), error, runId]
        );
        return { runId, status, result, error };
    };

    try {

        if (!automation.is_active) {
            return finish("skipped", { reason: "Automation disabled" });
        }

        const ctx = await buildContext({
            businessId: run.business_id,
            customerId: run.customer_id,
            conversationId: run.conversation_id,
            payload: run.payload
        });

        if (!ctx) {
            return finish("skipped", { reason: "Customer not found" });
        }

        // Re-check (things may have changed during a delay)
        const check = evaluateConditions(automation.conditions, ctx);

        if (!check.passed) {
            return finish("skipped", { reason: "Conditions no longer match", failed: check.failed });
        }

        const results = [];
        let anyFailed = false;
        let anyOk = false;

        for (const action of automation.actions || []) {

            const handler = ACTIONS[action.type];

            if (!handler) {
                results.push({ type: action.type, ok: false, detail: "Unknown action" });
                anyFailed = true;
                continue;
            }

            try {
                const outcome = await handler(action.params || {}, ctx, automation);
                results.push({ type: action.type, ...outcome });
                if (outcome.ok) anyOk = true;
                else if (!outcome.skipped) anyFailed = true;
            } catch (error) {
                results.push({ type: action.type, ok: false, detail: error.response?.data || error.message });
                anyFailed = true;
            }
        }

        const status = anyFailed ? "failed" : anyOk ? "success" : "skipped";

        return finish(status, { actions: results }, anyFailed ? "One or more actions failed" : null);

    } catch (error) {

        console.error(`Automation run ${runId} crashed:`, error.message);
        return finish("failed", {}, error.message);
    }
};


// --------------------------------------------------
// One automation vs one event
// --------------------------------------------------

const handleAutomation = async (automation, event) => {

    const { businessId, customerId, conversationId, payload = {} } = event;

    if (await isInCooldown(automation, customerId, conversationId)) {
        return null;
    }

    const ctx = await buildContext({ businessId, customerId, conversationId, payload });

    if (!ctx) return null;

    const check = evaluateConditions(automation.conditions, ctx);

    if (!check.passed) {
        return null;
    }

    const delay = automation.delay_minutes || 0;

    const insert = await pool.query(
        `INSERT INTO automation_runs (
            automation_id, business_id, customer_id, conversation_id, lead_id,
            trigger_type, payload, status, scheduled_for
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW() + ($9 || ' minutes')::interval)
         RETURNING id`,
        [
            automation.id,
            businessId,
            customerId,
            ctx.ids.conversationId,
            ctx.ids.leadId,
            automation.trigger_type,
            JSON.stringify(payload),
            delay > 0 ? "scheduled" : "running",
            String(delay)
        ]
    );

    const runId = insert.rows[0].id;

    if (delay > 0) {
        console.log(`⏰ Automation "${automation.name}" scheduled in ${delay} min (run ${runId})`);
        return { runId, status: "scheduled" };
    }

    const result = await executeRun(runId);

    console.log(`⚡ Automation "${automation.name}" -> ${result.status} (run ${runId})`);

    return result;
};


// --------------------------------------------------
// Public: fire an event (never throws, never blocks)
// --------------------------------------------------

const emitEvent = (triggerType, event) => {

    if (!TRIGGERS.includes(triggerType) || !event?.businessId || !event?.customerId) {
        return;
    }

    setImmediate(async () => {

        try {

            const automations = await pool.query(
                `SELECT * FROM automations
                 WHERE business_id = $1
                 AND trigger_type = $2
                 AND is_active = TRUE
                 ORDER BY id`,
                [event.businessId, triggerType]
            );

            for (const automation of automations.rows) {
                try {
                    await handleAutomation(automation, event);
                } catch (error) {
                    console.error(`Automation "${automation.name}" failed:`, error.message);
                }
            }

        } catch (error) {

            console.error(`emitEvent(${triggerType}) failed:`, error.message);
        }
    });
};


// --------------------------------------------------
// Scheduler jobs
// --------------------------------------------------

const processDueRuns = async (limit = 20) => {

    // Claim due runs so two workers never run the same one
    const due = await pool.query(
        `UPDATE automation_runs
         SET status = 'running'
         WHERE id IN (
            SELECT id FROM automation_runs
            WHERE status = 'scheduled'
            AND scheduled_for <= NOW()
            ORDER BY scheduled_for
            LIMIT $1
            FOR UPDATE SKIP LOCKED
         )
         RETURNING id`,
        [limit]
    );

    for (const row of due.rows) {
        const result = await executeRun(row.id);
        console.log(`⏰ Scheduled run ${row.id} -> ${result?.status}`);
    }

    return due.rows.length;
};


// Smallest "hours_inactive >= X" in the conditions, to pre-filter
const minInactiveHours = (conditions = []) => {
    const hours = conditions
        .filter(c => c.field === "hours_inactive" && ["gte", "gt"].includes(c.op))
        .map(c => Number(c.value))
        .filter(n => !Number.isNaN(n));
    return hours.length ? Math.min(...hours) : 1;
};


const scanInactiveConversations = async () => {

    const automations = await pool.query(
        `SELECT * FROM automations
         WHERE trigger_type = 'customer_inactive'
         AND is_active = TRUE`
    );

    let fired = 0;

    for (const automation of automations.rows) {

        // Open conversations where the BUSINESS spoke last and the
        // customer went quiet (not older than 7 days)
        const candidates = await pool.query(
            `SELECT c.id, c.customer_id
             FROM conversations c
             JOIN LATERAL (
                SELECT sender_type
                FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
             ) last ON TRUE
             WHERE c.business_id = $1
             AND c.status = 'open'
             AND c.handover_status = 'bot'
             AND last.sender_type <> 'customer'
             AND c.last_message_at <= NOW() - ($2 || ' hours')::interval
             AND c.last_message_at >= NOW() - INTERVAL '7 days'
             LIMIT 200`,
            [automation.business_id, String(minInactiveHours(automation.conditions))]
        );

        for (const conv of candidates.rows) {
            try {
                const result = await handleAutomation(automation, {
                    businessId: automation.business_id,
                    customerId: conv.customer_id,
                    conversationId: conv.id,
                    payload: {}
                });
                if (result) fired++;
            } catch (error) {
                console.error(`Inactive scan failed for conversation ${conv.id}:`, error.message);
            }
        }
    }

    return fired;
};


module.exports = {
    TRIGGERS,
    emitEvent,
    executeRun,
    handleAutomation,
    processDueRuns,
    scanInactiveConversations
};
