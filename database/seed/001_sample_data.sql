INSERT INTO businesses (name, email, phone)
VALUES (
    'Nexora Training Institute',
    'admin@nexora.example',
    '+94771234567'
);


INSERT INTO users (
    business_id,
    name,
    email,
    password_hash,
    role
)
VALUES (
    1,
    'Admin User',
    'admin@nexora.example',
    'TEMP_PASSWORD_HASH',
    'admin'
);


INSERT INTO customers (
    business_id,
    name,
    phone,
    email
)
VALUES
(
    1,
    'John Perera',
    '+94771234567',
    'john@example.com'
),
(
    1,
    'Kamal Silva',
    '+94772345678',
    'kamal@example.com'
),
(
    1,
    'Sara Fernando',
    '+94773456789',
    'sara@example.com'
);


INSERT INTO conversations (
    business_id,
    customer_id,
    status
)
VALUES
(
    1,
    1,
    'open'
),
(
    1,
    2,
    'open'
);


INSERT INTO messages (
    conversation_id,
    sender_type,
    message_type,
    message_text
)
VALUES
(
    1,
    'customer',
    'text',
    'Hi, what is the CCNA course fee?'
),
(
    1,
    'ai',
    'text',
    'The CCNA course fee is LKR 50,000.'
),
(
    1,
    'customer',
    'text',
    'Can I pay in installments?'
);