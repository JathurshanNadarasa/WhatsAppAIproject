-- ==================================================
-- Default automations (C11) for EVERY business.
-- Re-running is safe: existing names are skipped.
-- Edit or disable them later from the API/dashboard.
-- ==================================================

-- File is UTF-8 (emojis). Windows psql defaults to WIN1252.
SET client_encoding = 'UTF8';

INSERT INTO automations
    (business_id, name, description, trigger_type, conditions, actions, delay_minutes, cooldown_minutes)
SELECT b.id, a.name, a.description, a.trigger_type, a.conditions::jsonb, a.actions::jsonb, a.delay_minutes, a.cooldown_minutes
FROM businesses b
CROSS JOIN (VALUES
    (
        'Hot lead alert',
        'Tell staff when a lead becomes hot',
        'lead_temperature_changed',
        '[{"field": "lead.temperature", "op": "eq", "value": "hot"}]',
        '[{"type": "notify_staff", "params": {"type": "hot_lead", "title": "🔥 Hot lead: {{customer.name}}", "message": "{{customer.name}} ({{customer.phone}}) is interested in {{course}}. Score {{lead.score}}. Next: {{summary.next_action}}"}}]',
        0, 1440
    ),
    (
        'Registration request',
        'Customer says they want to register or join',
        'message_received',
        '[{"field": "intent", "op": "eq", "value": "REGISTRATION"}]',
        '[{"type": "notify_staff", "params": {"type": "registration", "title": "📝 Wants to register: {{customer.name}}", "message": "{{customer.name}} ({{customer.phone}}) wants to register for {{course}}: \"{{message.text}}\""}}]',
        0, 60
    ),
    (
        'Unanswered question',
        'The bot promised to check something with the team',
        'summary_updated',
        '[{"field": "summary.unanswered_count", "op": "gt", "value": 0}]',
        '[{"type": "notify_staff", "params": {"type": "unanswered", "title": "❓ Needs an answer: {{customer.name}}", "message": "Unanswered: {{summary.unanswered_questions}}"}}]',
        0, 720
    ),
    (
        'Follow-up after 20 hours',
        'Warm/hot lead went quiet. 20h keeps us inside WhatsApp''s 24h reply window.',
        'customer_inactive',
        '[{"field": "hours_inactive", "op": "gte", "value": 20}, {"field": "lead.temperature", "op": "in", "value": ["hot", "warm"]}, {"field": "lead.status", "op": "in", "value": ["new", "qualified"]}]',
        '[{"type": "send_whatsapp_message", "params": {"message": "Hi {{customer.first_name}}, just checking in 😊 Do you have any other questions about {{course}}? I''m happy to help."}}]',
        0, -1
    )
) AS a(name, description, trigger_type, conditions, actions, delay_minutes, cooldown_minutes)
ON CONFLICT (business_id, name) DO NOTHING;
