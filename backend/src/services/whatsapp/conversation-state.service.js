// --------------------------------------------------
// Conversation State Service (C7.6)
// --------------------------------------------------
// Stores what the bot "remembers" inside one conversation:
//   state             'active' | 'awaiting_name'
//   last_intent       last detected intent
//   current_course_id course the customer is talking about
//   context           JSONB flags, e.g. { name_asked: true }
// --------------------------------------------------

const pool = require("../../config/database");

const STATES = {
    ACTIVE: "active",
    AWAITING_NAME: "awaiting_name"
};


const getConversationState = async (conversationId) => {

    const result = await pool.query(
        `SELECT
            id,
            state,
            last_intent,
            current_course_id,
            context,
            handover_status,
            assigned_user_id
         FROM conversations
         WHERE id = $1`,
        [conversationId]
    );

    const row = result.rows[0];

    return {
        state: row?.state || STATES.ACTIVE,
        lastIntent: row?.last_intent || null,
        currentCourseId: row?.current_course_id || null,
        context: row?.context || {},
        // C12: bot | pending | human
        handoverStatus: row?.handover_status || "bot",
        assignedUserId: row?.assigned_user_id || null
    };
};


// Only updates the fields you pass.
// context is MERGED into the existing JSON, not replaced.
const updateConversationState = async (
    conversationId,
    {
        state,
        lastIntent,
        currentCourseId,
        context
    } = {}
) => {

    const sets = [];
    const values = [];

    const add = (sql, value) => {
        values.push(value);
        sets.push(sql.replace("?", `$${values.length}`));
    };

    if (state !== undefined) add("state = ?", state);
    if (lastIntent !== undefined) add("last_intent = ?", lastIntent);
    if (currentCourseId !== undefined) add("current_course_id = ?", currentCourseId);
    if (context !== undefined) add("context = context || ?::jsonb", JSON.stringify(context));

    if (sets.length === 0) {
        return;
    }

    sets.push("updated_at = CURRENT_TIMESTAMP");
    values.push(conversationId);

    await pool.query(
        `UPDATE conversations
         SET ${sets.join(", ")}
         WHERE id = $${values.length}`,
        values
    );
};


// Save intent + entities on the customer's message row
const saveMessageAnalysis = async (
    messageId,
    intent,
    entities
) => {

    await pool.query(
        `UPDATE messages
         SET intent = $1,
             entities = $2::jsonb
         WHERE id = $3`,
        [
            intent,
            JSON.stringify(entities || {}),
            messageId
        ]
    );
};


module.exports = {
    STATES,
    getConversationState,
    updateConversationState,
    saveMessageAnalysis
};
