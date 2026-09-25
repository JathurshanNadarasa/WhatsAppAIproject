// --------------------------------------------------
// Builds the data an automation can check / use (C11)
// --------------------------------------------------
// Fields available in conditions and {{templates}}:
//   customer.name / first_name / phone
//   lead.status / temperature / score / interested_courses
//   course                  primary course name
//   intent, message.text    (message_received)
//   summary.interest_level / next_action / unanswered_questions
//   summary.unanswered_count
//   hours_inactive          hours since the last message
//   hours_since_customer_message
//   event.old / event.new   (…_changed triggers)
//   conversation.handover_status   bot | pending | human (C12)
//   business.name
// --------------------------------------------------

const pool = require("../../config/database");


const buildContext = async ({
    businessId,
    customerId,
    conversationId = null,
    payload = {}
}) => {

    const customerResult = await pool.query(
        `SELECT id, name, phone, name_confirmed
         FROM customers
         WHERE id = $1 AND business_id = $2`,
        [customerId, businessId]
    );

    const customer = customerResult.rows[0];

    if (!customer) {
        return null;
    }

    const [businessResult, leadResult] = await Promise.all([
        pool.query(`SELECT id, name, whatsapp_phone_number_id FROM businesses WHERE id = $1`, [businessId]),
        pool.query(
            `SELECT l.*, co.name AS primary_course_name
             FROM leads l
             LEFT JOIN courses co ON co.id = l.primary_course_id
             WHERE l.business_id = $1 AND l.customer_id = $2`,
            [businessId, customerId]
        )
    ]);

    const lead = leadResult.rows[0] || null;

    const convId = conversationId || lead?.conversation_id || null;

    let conversation = null;
    let summary = null;
    let lastCustomerMessageAt = null;

    if (convId) {

        const [convResult, summaryResult, lastCustomerResult] = await Promise.all([
            pool.query(`SELECT * FROM conversations WHERE id = $1`, [convId]),
            pool.query(`SELECT * FROM conversation_summaries WHERE conversation_id = $1`, [convId]),
            pool.query(
                `SELECT MAX(created_at) AS at
                 FROM messages
                 WHERE conversation_id = $1 AND sender_type = 'customer'`,
                [convId]
            )
        ]);

        conversation = convResult.rows[0] || null;
        summary = summaryResult.rows[0] || null;
        lastCustomerMessageAt = lastCustomerResult.rows[0]?.at || null;
    }

    const hoursSince = (date) =>
        date ? Math.round(((Date.now() - new Date(date).getTime()) / 3600000) * 10) / 10 : null;

    const knownName = customer.name_confirmed ? customer.name : null;

    return {
        business: businessResult.rows[0] || {},
        customer: {
            id: customer.id,
            // Phone is shown separately in templates, so don't repeat it here
            name: knownName || "New customer",
            first_name: knownName ? knownName.split(" ")[0] : "there",
            phone: customer.phone
        },
        lead: lead
            ? {
                id: lead.id,
                status: lead.status,
                temperature: lead.temperature,
                score: lead.score,
                interested_courses: lead.interested_courses || []
            }
            : {},
        course:
            lead?.primary_course_name ||
            lead?.interested_courses?.[0] ||
            "our courses",
        conversation: conversation
            ? {
                id: conversation.id,
                state: conversation.state,
                status: conversation.status,
                handover_status: conversation.handover_status
            }
            : {},
        summary: summary
            ? {
                interest_level: summary.interest_level,
                next_action: summary.next_action || "",
                unanswered_questions: summary.unanswered_questions || [],
                unanswered_count: (summary.unanswered_questions || []).length
            }
            : { unanswered_count: 0 },
        intent: payload.intent || null,
        message: { text: payload.messageText || "" },
        event: { old: payload.old ?? null, new: payload.new ?? null },
        hours_inactive: hoursSince(conversation?.last_message_at),
        hours_since_customer_message: hoursSince(lastCustomerMessageAt),
        ids: {
            businessId,
            customerId,
            conversationId: convId,
            leadId: lead?.id || null
        }
    };
};


module.exports = {
    buildContext
};
