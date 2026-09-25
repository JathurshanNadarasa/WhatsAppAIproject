-- ==================================================
-- 007 - Human Handover (C12)
-- ==================================================
-- handover_status on a conversation:
--   bot      AI answers (default)
--   pending  customer/staff asked for a human, nobody accepted yet
--            -> bot stays silent
--   human    a staff member is handling it -> bot stays silent
-- Safe to run more than once.
-- ==================================================

BEGIN;

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS handover_status VARCHAR(20) NOT NULL DEFAULT 'bot',
    ADD COLUMN IF NOT EXISTS assigned_user_id INTEGER,
    ADD COLUMN IF NOT EXISTS handover_reason TEXT,
    ADD COLUMN IF NOT EXISTS handover_requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS handover_accepted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_staff_reply_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS wait_notice_sent_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_conversations_assigned_user') THEN
        ALTER TABLE conversations
            ADD CONSTRAINT fk_conversations_assigned_user
            FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_conversations_handover_status') THEN
        ALTER TABLE conversations
            ADD CONSTRAINT chk_conversations_handover_status
            CHECK (handover_status IN ('bot', 'pending', 'human'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_handover
    ON conversations (business_id, handover_status)
    WHERE handover_status <> 'bot';


-- Which staff member wrote a message (sender_type = 'staff')
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS sent_by_user_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_sent_by_user') THEN
        ALTER TABLE messages
            ADD CONSTRAINT fk_messages_sent_by_user
            FOREIGN KEY (sent_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;


-- History of every handover step
CREATE TABLE IF NOT EXISTS handover_events (
    id SERIAL PRIMARY KEY,

    conversation_id INTEGER NOT NULL
        REFERENCES conversations(id) ON DELETE CASCADE,

    business_id INTEGER NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,

    -- requested | accepted | assigned | released | auto_released | wait_notice
    event_type VARCHAR(30) NOT NULL,

    reason TEXT,

    -- Who did it (NULL = system / customer)
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Assigned to (for "assigned")
    target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_handover_events_conversation
    ON handover_events (conversation_id, created_at DESC);

-- C11's "Staff requested" automation only sent a notification.
-- The handover itself now notifies staff, so turn it off to
-- avoid duplicate alerts (edit/re-enable it if you want).
UPDATE automations
SET is_active = FALSE,
    description = 'Disabled by C12: handover now notifies staff itself',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Staff requested'
AND trigger_type = 'message_received'
AND is_active = TRUE;

COMMIT;
