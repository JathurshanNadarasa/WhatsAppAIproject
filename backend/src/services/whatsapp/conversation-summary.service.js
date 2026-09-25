// --------------------------------------------------
// Conversation Summary Service (C9)
// --------------------------------------------------
// - generateSummary(): asks the AI service to summarize a
//   conversation and saves it (one row per conversation)
// - refreshSummaryInBackground(): called after every reply,
//   regenerates only when enough new messages arrived or an
//   important intent happened. Never blocks the WhatsApp reply.
// --------------------------------------------------

const axios = require("axios");

const pool = require("../../config/database");

// Lazy require avoids a circular import
const refreshLead = (businessId, customerId) =>
    require("../lead/lead.service")
        .refreshLeadInBackground(businessId, customerId);


const SUMMARY_EVERY_N_MESSAGES =
    Number(process.env.SUMMARY_EVERY_N_MESSAGES) || 6;

const SUMMARY_TIMEOUT_MS =
    Number(process.env.AI_SERVICE_TIMEOUT_MS) || 45000;

// Summarize right away when these happen
const IMPORTANT_INTENTS = new Set([
    "REGISTRATION",
    "HUMAN_HANDOVER",
    "PAYMENT_INQUIRY"
]);

// Conversations currently being summarized (avoid duplicates)
const inProgress = new Set();


// --------------------------------------------------
// Read
// --------------------------------------------------

const getSummary = async (conversationId, businessId) => {

    const result = await pool.query(
        `SELECT s.*
         FROM conversation_summaries s
         WHERE s.conversation_id = $1
         AND s.business_id = $2`,
        [conversationId, businessId]
    );

    return result.rows[0] || null;
};


// --------------------------------------------------
// Generate + save
// --------------------------------------------------

const generateSummary = async (conversationId) => {

    // 1. Conversation + customer + business
    const conversationResult = await pool.query(
        `SELECT
            c.id,
            c.business_id,
            c.customer_id,
            cu.name AS customer_name,
            cu.name_confirmed,
            b.name AS business_name
         FROM conversations c
         JOIN customers cu ON cu.id = c.customer_id
         JOIN businesses b ON b.id = c.business_id
         WHERE c.id = $1`,
        [conversationId]
    );

    const conversation = conversationResult.rows[0];

    if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
    }

    // 2. Messages (oldest first)
    const messagesResult = await pool.query(
        `SELECT sender_type, message_text, intent, entities
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC, id ASC`,
        [conversationId]
    );

    const messages = messagesResult.rows;

    if (messages.length === 0) {
        return null;
    }

    // 3. Course names (so the AI can't invent courses)
    const coursesResult = await pool.query(
        `SELECT name
         FROM courses
         WHERE business_id = $1
         AND status = 'active'`,
        [conversation.business_id]
    );

    // 4. Ask the AI service
    const response = await axios.post(
        `${process.env.AI_SERVICE_URL}/ai/summarize`,
        {
            messages,
            context: {
                business: { name: conversation.business_name },
                customer: {
                    name: conversation.name_confirmed
                        ? conversation.customer_name
                        : null
                },
                courses: coursesResult.rows.map(row => row.name)
            }
        },
        { timeout: SUMMARY_TIMEOUT_MS }
    );

    const summary = response.data.summary;
    const source = response.data.source || "rule";

    // 5. Upsert
    const saved = await pool.query(
        `INSERT INTO conversation_summaries (
            conversation_id,
            business_id,
            summary,
            primary_intent,
            customer_requirements,
            interested_courses,
            next_action,
            interest_level,
            sentiment,
            language,
            unanswered_questions,
            message_count,
            source
         )
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11::jsonb, $12, $13)
         ON CONFLICT (conversation_id) DO UPDATE SET
            summary = EXCLUDED.summary,
            primary_intent = EXCLUDED.primary_intent,
            customer_requirements = EXCLUDED.customer_requirements,
            interested_courses = EXCLUDED.interested_courses,
            next_action = EXCLUDED.next_action,
            interest_level = EXCLUDED.interest_level,
            sentiment = EXCLUDED.sentiment,
            language = EXCLUDED.language,
            unanswered_questions = EXCLUDED.unanswered_questions,
            message_count = EXCLUDED.message_count,
            source = EXCLUDED.source,
            updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
            conversationId,
            conversation.business_id,
            summary.summary,
            summary.primary_intent,
            JSON.stringify(summary.customer_requirements || []),
            JSON.stringify(summary.interested_courses || []),
            summary.next_action,
            summary.interest_level,
            summary.sentiment,
            summary.language,
            JSON.stringify(summary.unanswered_questions || []),
            messages.length,
            source
        ]
    );

    // Summary changed -> lead score may change (C10)
    refreshLead(conversation.business_id, conversation.customer_id);

    // Automations (C11)
    require("../automation/automation-engine").emitEvent("summary_updated", {
        businessId: conversation.business_id,
        customerId: conversation.customer_id,
        conversationId,
        payload: {}
    });

    return saved.rows[0];
};


// --------------------------------------------------
// Should we regenerate?
// --------------------------------------------------

const shouldRefresh = async (conversationId, intent) => {

    const result = await pool.query(
        `SELECT
            (SELECT COUNT(*)::int FROM messages WHERE conversation_id = $1) AS total,
            (SELECT message_count FROM conversation_summaries WHERE conversation_id = $1) AS summarized`,
        [conversationId]
    );

    const { total, summarized } = result.rows[0];

    // Important moment -> summarize now (if anything new)
    if (IMPORTANT_INTENTS.has(intent) && total > (summarized || 0)) {
        return true;
    }

    // First summary once the chat has some substance
    if (summarized === null) {
        return total >= SUMMARY_EVERY_N_MESSAGES;
    }

    return total - summarized >= SUMMARY_EVERY_N_MESSAGES;
};


// --------------------------------------------------
// Fire-and-forget refresh (never throws)
// --------------------------------------------------

const refreshSummaryInBackground = (conversationId, { intent } = {}) => {

    if (!conversationId || inProgress.has(conversationId)) {
        return;
    }

    inProgress.add(conversationId);

    setImmediate(async () => {

        try {

            if (!(await shouldRefresh(conversationId, intent))) {
                return;
            }

            const saved = await generateSummary(conversationId);

            if (saved) {
                console.log(
                    `Summary updated for conversation ${conversationId} ` +
                    `(${saved.source}, interest: ${saved.interest_level})`
                );
            }

        } catch (error) {

            console.error(
                `Summary refresh failed for conversation ${conversationId}:`,
                error.response?.data || error.message
            );

        } finally {

            inProgress.delete(conversationId);
        }
    });
};


module.exports = {
    SUMMARY_EVERY_N_MESSAGES,
    getSummary,
    generateSummary,
    refreshSummaryInBackground
};
