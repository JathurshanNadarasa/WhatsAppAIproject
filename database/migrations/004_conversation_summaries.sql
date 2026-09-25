-- ==================================================
-- 004 - AI Conversation Summaries (C9)
-- ==================================================
-- One summary per conversation. It is re-generated
-- as the conversation grows (see SUMMARY_EVERY_N_MESSAGES).
-- Safe to run more than once.
-- ==================================================

BEGIN;

CREATE TABLE IF NOT EXISTS conversation_summaries (
    id SERIAL PRIMARY KEY,

    conversation_id INTEGER NOT NULL UNIQUE
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    business_id INTEGER NOT NULL
        REFERENCES businesses(id)
        ON DELETE CASCADE,

    -- 2-4 sentence plain-English summary for staff
    summary TEXT NOT NULL,

    -- Main intent of the whole conversation, e.g. COURSE_INQUIRY
    primary_intent VARCHAR(50),

    -- ["Wants weekend batch", "Asked about installment payment"]
    customer_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ["CCNA", "Python Programming"]
    interested_courses JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- What staff should do next
    next_action TEXT,

    -- high | medium | low   (used by C10 lead scoring)
    interest_level VARCHAR(20),

    -- positive | neutral | negative
    sentiment VARCHAR(20),

    -- english | tamil | sinhala | mixed ...
    language VARCHAR(30),

    -- Questions the bot could not answer (need staff)
    unanswered_questions JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- How many messages existed when this summary was made
    message_count INTEGER NOT NULL DEFAULT 0,

    -- llm | rule
    source VARCHAR(20) NOT NULL DEFAULT 'rule',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_business
    ON conversation_summaries (business_id);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_interest
    ON conversation_summaries (business_id, interest_level);

COMMIT;
