-- ==================================================
-- 005 - Lead Management (C10)
-- ==================================================
-- One lead per customer per business.
-- Score + temperature are recalculated automatically;
-- status is changed by staff (except a few auto moves).
-- Safe to run more than once.
-- ==================================================

BEGIN;

CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,

    business_id INTEGER NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,

    customer_id INTEGER NOT NULL
        REFERENCES customers(id) ON DELETE CASCADE,

    -- Latest conversation of this customer
    conversation_id INTEGER
        REFERENCES conversations(id) ON DELETE SET NULL,

    -- new | contacted | qualified | registered | lost
    status VARCHAR(20) NOT NULL DEFAULT 'new',

    -- 0 - 100
    score INTEGER NOT NULL DEFAULT 0,

    -- hot | warm | cold
    temperature VARCHAR(10) NOT NULL DEFAULT 'cold',

    -- How the score was built, e.g. {"FEE_INQUIRY": 15, "recency": -10}
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- ["CCNA", "Python Programming"]
    interested_courses JSONB NOT NULL DEFAULT '[]'::jsonb,

    primary_course_id INTEGER
        REFERENCES courses(id) ON DELETE SET NULL,

    source VARCHAR(30) NOT NULL DEFAULT 'whatsapp',

    notes TEXT,

    -- Staff member responsible (used by C12 handover)
    assigned_user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL,

    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_leads_business_customer UNIQUE (business_id, customer_id),

    CONSTRAINT chk_leads_status CHECK (
        status IN ('new', 'contacted', 'qualified', 'registered', 'lost')
    ),

    CONSTRAINT chk_leads_temperature CHECK (
        temperature IN ('hot', 'warm', 'cold')
    ),

    CONSTRAINT chk_leads_score CHECK (score BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_leads_business_status
    ON leads (business_id, status);

CREATE INDEX IF NOT EXISTS idx_leads_business_temperature
    ON leads (business_id, temperature, score DESC);

CREATE INDEX IF NOT EXISTS idx_leads_business_activity
    ON leads (business_id, last_activity_at DESC);


-- History: every status / temperature change and note
CREATE TABLE IF NOT EXISTS lead_events (
    id SERIAL PRIMARY KEY,

    lead_id INTEGER NOT NULL
        REFERENCES leads(id) ON DELETE CASCADE,

    -- created | status_changed | temperature_changed | note_added
    event_type VARCHAR(30) NOT NULL,

    old_value TEXT,
    new_value TEXT,

    -- NULL = done automatically by the system
    user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead
    ON lead_events (lead_id, created_at DESC);

COMMIT;
