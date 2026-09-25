// Shapes returned by the Nexora backend (C7.6 - C13)

export type Temperature = "hot" | "warm" | "cold";
export type LeadStatus = "new" | "contacted" | "qualified" | "registered" | "lost";
export type HandoverStatus = "bot" | "pending" | "human";
export type SenderType = "customer" | "business" | "staff";

export interface ConversationRow {
    id: number;
    customer_id: number;
    customer_name: string | null;
    customer_phone: string;
    name_confirmed: boolean;
    status: string;
    started_at: string;
    last_message_at: string;
    handover_status: HandoverStatus;
    assigned_user_id: number | null;
    lead_id: number | null;
    temperature: Temperature | null;
    score: number | null;
    last_message_text: string | null;
    last_sender_type: SenderType | null;
}

export interface ChatMessage {
    id: number;
    sender_type: SenderType;
    message_type: string;
    message_text: string | null;
    created_at: string;
    sent_by_user_id: number | null;
    sent_by_user_name: string | null;
    // C14
    delivery_status: "pending" | "sent" | "delivered" | "read" | "failed" | null;
    delivery_error: string | null;
    template_name: string | null;
}

export interface WhatsAppTemplate {
    name: string;
    language: string;
    category: string;
    body: string;
    params: number;
}

export interface Summary {
    summary: string;
    primary_intent: string | null;
    customer_requirements: string[];
    interested_courses: string[];
    next_action: string | null;
    interest_level: "high" | "medium" | "low" | null;
    sentiment: string | null;
    language: string | null;
    unanswered_questions: string[];
    message_count: number;
    source: "llm" | "rule";
    updated_at: string;
}

export interface LeadRow {
    id: number;
    status: LeadStatus;
    score: number;
    temperature: Temperature;
    interested_courses: string[];
    last_activity_at: string;
    created_at: string;
    conversation_id: number | null;
    assigned_user_id: number | null;
    customer_id: number;
    customer_name: string | null;
    customer_phone: string;
    next_action: string | null;
    summary: string | null;
}

export interface LeadEvent {
    id: number;
    event_type: string;
    old_value: string | null;
    new_value: string | null;
    user_name: string | null;
    created_at: string;
}

export interface LeadDetail extends Omit<LeadRow, "summary"> {
    notes: string | null;
    score_breakdown: Record<string, number>;
    primary_course_name: string | null;
    summary: Summary | null;
    events: LeadEvent[];
}

export interface LeadStats {
    total: number;
    hot: number;
    warm: number;
    cold: number;
    new: number;
    contacted: number;
    qualified: number;
    registered: number;
    lost: number;
}

export interface QueueItem {
    conversation_id: number;
    handover_status: "pending" | "human";
    handover_reason: string | null;
    handover_requested_at: string | null;
    assigned_user_id: number | null;
    assigned_user_name: string | null;
    customer_name: string | null;
    customer_phone: string;
    lead_id: number | null;
    temperature: Temperature | null;
    score: number | null;
    waiting_minutes: number | null;
    last_customer_message: string | null;
    unanswered_count: number;
}

export interface Notification {
    id: number;
    type: string;
    title: string;
    body: string | null;
    lead_id: number | null;
    conversation_id: number | null;
    is_read: boolean;
    created_at: string;
}

export interface Condition { field: string; op: string; value?: unknown }
export interface Action { type: string; params?: Record<string, unknown> }

export interface Automation {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    trigger_type: string;
    conditions: Condition[];
    actions: Action[];
    delay_minutes: number;
    cooldown_minutes: number;
    success_count: number;
    last_run_at: string | null;
}

export interface AutomationRun {
    id: number;
    automation_name: string;
    customer_name: string | null;
    customer_phone: string | null;
    trigger_type: string;
    status: "scheduled" | "running" | "success" | "failed" | "skipped";
    result: { actions?: { type: string; ok: boolean; detail?: unknown }[]; reason?: string } | null;
    created_at: string;
    executed_at: string | null;
}

export interface Course {
    id: number;
    name: string;
    description: string | null;
    duration: string | null;
    fee: string | null;
    schedule: string | null;
    requirements: string | null;
    status: "active" | "inactive";
}

export interface Faq {
    id: number;
    question: string;
    answer: string;
    category: string | null;
    status: "active" | "inactive";
}

export interface Overview {
    days: number;
    totals: {
        active_customers: number;
        customer_messages: number;
        bot_messages: number;
        staff_messages: number;
        automation_rate: number | null;
    };
    daily: { day: string; customer: number; bot: number; staff: number }[];
    leads: LeadStats;
    courses: { course: string; leads: number; hot: number; registered: number }[];
    intents: { intent: string; count: number }[];
    handover: { pending: number; human: number; requested: number };
}

export type Role = "admin" | "staff";

export interface TeamMember {
    id: number;
    name: string;
    email: string;
    role: Role;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    open_chats: number;
}

export interface SessionUser {
    userId: number;
    businessId: number;
    role: Role;
    name: string;
}
