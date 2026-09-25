-- ==================================================
-- 006 - Automation Engine + Notifications (C11)
-- ==================================================
-- automation = WHEN <trigger> IF <conditions> THEN <actions>
-- Safe to run more than once.
-- ==================================================

BEGIN;

CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,

    business_id INTEGER NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- message_received | lead_created | lead_temperature_changed |
    -- lead_status_changed | summary_updated | customer_inactive
    trigger_type VARCHAR(50) NOT NULL,

    -- [{"field": "lead.temperature", "op": "eq", "value": "hot"}]  (ALL must match)
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- [{"type": "notify_staff", "params": {"title": "...", "message": "..."}}]
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Wait before running the actions (conditions are re-checked then)
    delay_minutes INTEGER NOT NULL DEFAULT 0,

    -- Do not run again for the same customer within this time
    -- (0 = no limit, -1 = only once ever per conversation)
    cooldown_minutes INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_automations_business_name UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_automations_business_trigger
    ON automations (business_id, trigger_type)
    WHERE is_active = TRUE;


CREATE TABLE IF NOT EXISTS automation_runs (
    id SERIAL PRIMARY KEY,

    automation_id INTEGER NOT NULL
        REFERENCES automations(id) ON DELETE CASCADE,

    business_id INTEGER NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,

    customer_id INTEGER
        REFERENCES customers(id) ON DELETE CASCADE,

    conversation_id INTEGER
        REFERENCES conversations(id) ON DELETE SET NULL,

    lead_id INTEGER
        REFERENCES leads(id) ON DELETE SET NULL,

    trigger_type VARCHAR(50) NOT NULL,

    -- Event data (old/new values etc.)
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- scheduled | running | success | failed | skipped
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',

    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,

    -- What each action did
    result JSONB,
    error TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_due
    ON automation_runs (scheduled_for)
    WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_automation_runs_cooldown
    ON automation_runs (automation_id, customer_id, created_at DESC);


CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,

    business_id INTEGER NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,

    -- NULL = for all staff of the business
    user_id INTEGER
        REFERENCES users(id) ON DELETE CASCADE,

    -- hot_lead | registration | handover | unanswered | automation ...
    type VARCHAR(50) NOT NULL DEFAULT 'automation',

    title VARCHAR(200) NOT NULL,
    body TEXT,

    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    automation_id INTEGER REFERENCES automations(id) ON DELETE SET NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications (business_id, is_read, created_at DESC);

COMMIT;
