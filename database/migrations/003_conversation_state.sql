-- ==================================================
-- 003 - Conversation State + Customer Intelligence (C7.6)
-- ==================================================
-- Safe to run more than once (IF NOT EXISTS everywhere).
-- Part A syncs columns that already exist in the live DB
-- but were missing from migrations 001/002, so a fresh
-- setup matches production.
-- ==================================================

BEGIN;

-- --------------------------------------------------
-- A. Sync existing live-DB columns
-- --------------------------------------------------

ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS whatsapp_business_account_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_whatsapp_phone_number_id
    ON businesses (whatsapp_phone_number_id)
    WHERE whatsapp_phone_number_id IS NOT NULL;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id
    ON messages (whatsapp_message_id)
    WHERE whatsapp_message_id IS NOT NULL;


-- --------------------------------------------------
-- B. Customers: remember whether the name is real
-- --------------------------------------------------

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS name_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Names already captured by C7.5 count as confirmed
UPDATE customers
SET name_confirmed = TRUE
WHERE name IS NOT NULL
  AND name <> ''
  AND name <> 'WhatsApp Customer';

CREATE INDEX IF NOT EXISTS idx_customers_business_phone
    ON customers (business_id, phone);


-- --------------------------------------------------
-- C. Conversations: state machine + memory
-- --------------------------------------------------
-- state:
--   'active'        normal bot conversation
--   'awaiting_name' bot asked for the name, next reply may be it
-- context (JSONB) holds small flags, e.g. {"name_asked": true}

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS state VARCHAR(50) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS last_intent VARCHAR(50),
    ADD COLUMN IF NOT EXISTS current_course_id INTEGER,
    ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_conversations_current_course'
    ) THEN
        ALTER TABLE conversations
            ADD CONSTRAINT fk_conversations_current_course
            FOREIGN KEY (current_course_id)
            REFERENCES courses(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_business_customer_status
    ON conversations (business_id, customer_id, status);


-- --------------------------------------------------
-- D. Messages: per-message intent + entities
-- --------------------------------------------------

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS intent VARCHAR(50),
    ADD COLUMN IF NOT EXISTS entities JSONB;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages (conversation_id, created_at);

COMMIT;
