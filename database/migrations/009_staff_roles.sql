-- ==================================================
-- 009 - Staff accounts + roles (C15)
-- ==================================================
-- role:
--   admin  everything, incl. staff accounts, automations,
--          courses & FAQs, assigning chats to anyone
--   staff  inbox, leads, notifications; can take chats
--          for themselves
-- is_active = FALSE blocks login immediately (keeps history)
-- Safe to run more than once.
-- ==================================================

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Emails are compared case-insensitively from now on
UPDATE users SET email = LOWER(TRIM(email)) WHERE email <> LOWER(TRIM(email));

UPDATE users SET role = 'admin' WHERE role IS NULL OR role NOT IN ('admin', 'staff');

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role') THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_role CHECK (role IN ('admin', 'staff'));
    END IF;
END $$;

-- Seed user with a placeholder password can never log in: disable it
UPDATE users SET is_active = FALSE
WHERE password_hash = 'TEMP_PASSWORD_HASH';

CREATE INDEX IF NOT EXISTS idx_users_business_active
    ON users (business_id, is_active);

COMMIT;
