-- ==================================================
-- 008 - Real WhatsApp delivery (C14)
-- ==================================================
-- delivery_status on OUR messages (bot / staff):
--   pending    saved, not sent (sending disabled or not tried)
--   sent       Meta accepted it
--   delivered  reached the phone
--   read       customer opened it
--   failed     Meta rejected it (see delivery_error)
-- Safe to run more than once.
-- ==================================================

BEGIN;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS delivery_error TEXT,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP,
    -- Incoming media (image / audio / document ...)
    ADD COLUMN IF NOT EXISTS media_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS media_mime_type VARCHAR(100),
    -- Outgoing template name, if a template was used
    ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_messages_delivery_failed
    ON messages (conversation_id)
    WHERE delivery_status = 'failed';

COMMIT;
