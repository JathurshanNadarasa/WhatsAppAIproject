// --------------------------------------------------
// Dashboard analytics (C13)
// --------------------------------------------------

const pool = require("../../config/database");

const { getLeadStats } = require("../lead/lead.service");


const getOverview = async (businessId, days = 14) => {

    const window = Math.min(Math.max(Number(days) || 14, 1), 90);

    const [totals, daily, courses, intents, handover, leadStats] = await Promise.all([

        pool.query(
            `SELECT
                COUNT(DISTINCT c.customer_id) FILTER (WHERE m.sender_type = 'customer')::int AS active_customers,
                COUNT(*) FILTER (WHERE m.sender_type = 'customer')::int AS customer_messages,
                COUNT(*) FILTER (WHERE m.sender_type = 'business')::int AS bot_messages,
                COUNT(*) FILTER (WHERE m.sender_type = 'staff')::int AS staff_messages
             FROM messages m
             JOIN conversations c ON c.id = m.conversation_id
             WHERE c.business_id = $1
             AND m.created_at >= NOW() - ($2 || ' days')::interval`,
            [businessId, String(window)]
        ),

        pool.query(
            `SELECT
                to_char(d.day, 'YYYY-MM-DD') AS day,
                COUNT(m.id) FILTER (WHERE m.sender_type = 'customer')::int AS customer,
                COUNT(m.id) FILTER (WHERE m.sender_type = 'business')::int AS bot,
                COUNT(m.id) FILTER (WHERE m.sender_type = 'staff')::int AS staff
             FROM generate_series(
                CURRENT_DATE - ($2::int - 1),
                CURRENT_DATE,
                INTERVAL '1 day'
             ) AS d(day)
             LEFT JOIN messages m
                ON m.created_at::date = d.day::date
                AND m.conversation_id IN (SELECT id FROM conversations WHERE business_id = $1)
             GROUP BY d.day
             ORDER BY d.day`,
            [businessId, window]
        ),

        pool.query(
            `SELECT course,
                COUNT(*)::int AS leads,
                COUNT(*) FILTER (WHERE temperature = 'hot')::int AS hot,
                COUNT(*) FILTER (WHERE status = 'registered')::int AS registered
             FROM leads, jsonb_array_elements_text(interested_courses) AS course
             WHERE business_id = $1
             GROUP BY course
             ORDER BY leads DESC
             LIMIT 10`,
            [businessId]
        ),

        pool.query(
            `SELECT m.intent, COUNT(*)::int AS count
             FROM messages m
             JOIN conversations c ON c.id = m.conversation_id
             WHERE c.business_id = $1
             AND m.sender_type = 'customer'
             AND m.intent IS NOT NULL
             AND m.created_at >= NOW() - ($2 || ' days')::interval
             GROUP BY m.intent
             ORDER BY count DESC`,
            [businessId, String(window)]
        ),

        pool.query(
            `SELECT
                (SELECT COUNT(*)::int FROM conversations
                 WHERE business_id = $1 AND handover_status = 'pending') AS pending,
                (SELECT COUNT(*)::int FROM conversations
                 WHERE business_id = $1 AND handover_status = 'human') AS human,
                (SELECT COUNT(*)::int FROM handover_events
                 WHERE business_id = $1 AND event_type = 'requested'
                 AND created_at >= NOW() - ($2 || ' days')::interval) AS requested`,
            [businessId, String(window)]
        ),

        getLeadStats(businessId)
    ]);

    const t = totals.rows[0];
    const replies = t.bot_messages + t.staff_messages;

    return {
        days: window,
        totals: {
            ...t,
            // Share of replies written by the bot
            automation_rate: replies ? Math.round((t.bot_messages / replies) * 100) : null
        },
        daily: daily.rows,
        leads: leadStats,
        courses: courses.rows,
        intents: intents.rows,
        handover: handover.rows[0]
    };
};


module.exports = {
    getOverview
};
