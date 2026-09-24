CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,

    business_id INTEGER NOT NULL
        REFERENCES businesses(id)
        ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,

    description TEXT,

    duration VARCHAR(100),

    fee DECIMAL(10, 2),

    schedule TEXT,

    requirements TEXT,

    status VARCHAR(50) DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_courses_business_id
ON courses(business_id);


CREATE INDEX IF NOT EXISTS idx_courses_name
ON courses(name);


CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,

    business_id INTEGER NOT NULL
        REFERENCES businesses(id)
        ON DELETE CASCADE,

    question TEXT NOT NULL,

    answer TEXT NOT NULL,

    category VARCHAR(100),

    status VARCHAR(50) DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_faqs_business_id
ON faqs(business_id);