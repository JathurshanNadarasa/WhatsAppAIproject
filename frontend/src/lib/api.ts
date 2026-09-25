import axios, { AxiosError } from "axios";

import type {
    Automation, AutomationRun, ChatMessage, ConversationRow, Course, Faq,
    LeadDetail, LeadRow, LeadStats, Notification, Overview, QueueItem, SessionUser, Summary,
    TeamMember, WhatsAppTemplate,
} from "./types";

export const TOKEN_KEY = "nexora_token";
export const USER_KEY = "nexora_user";
export const ROLE_KEY = "nexora_role";
export const USER_ID_KEY = "nexora_user_id";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = window.localStorage.getItem(TOKEN_KEY);
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Expired / missing login -> back to the login page
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401 && typeof window !== "undefined"
            && !window.location.pathname.startsWith("/login")) {
            window.localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export const errorMessage = (error: unknown, fallback = "Something went wrong.") => {
    if (axios.isAxiosError(error)) {
        if (!error.response) return "Can't reach the server. Is the backend running on port 5000?";
        const message = (error.response.data as { message?: string } | undefined)?.message;
        return message || fallback;
    }
    return fallback;
};


// ---------- Auth ----------
export const login = async (email: string, password: string) =>
    (await api.post("/auth/login", { email, password })).data as {
        token: string;
        user: { id: number; name: string; email: string; role: string };
    };

export const getMe = async () => (await api.get("/auth/me")).data.user as SessionUser;

// ---------- Team (C15) ----------
export const getTeam = async (all = false) =>
    (await api.get("/users", { params: all ? { all: "true" } : {} })).data.users as TeamMember[];

export const addTeamMember = async (body: { name: string; email: string; password: string; role: string }) =>
    (await api.post("/users", body)).data.user as TeamMember;

export const updateTeamMember = async (
    id: number,
    body: { name?: string; role?: string; is_active?: boolean; password?: string }
) => (await api.patch(`/users/${id}`, body)).data.user as TeamMember;

export const assignConversation = async (id: number, userId: number) =>
    api.post(`/handover/${id}/assign`, { userId });

// ---------- Overview ----------
export const getOverview = async (days = 14) =>
    (await api.get("/analytics/overview", { params: { days } })).data as Overview;

// ---------- Conversations / inbox ----------
export const getConversations = async () =>
    (await api.get("/conversations")).data.conversations as ConversationRow[];

export const getMessages = async (id: number) =>
    (await api.get(`/conversations/${id}/messages`)).data.messages as ChatMessage[];

export const getSummary = async (id: number) =>
    (await api.get(`/conversations/${id}/summary`)).data.summary as Summary | null;

export const regenerateSummary = async (id: number) =>
    (await api.post(`/conversations/${id}/summary`)).data.summary as Summary;

// ---------- Handover ----------
export const getQueue = async () =>
    (await api.get("/handover/queue")).data.queue as QueueItem[];

export const takeOver = async (id: number) => api.post(`/handover/${id}/accept`);
export const releaseToBot = async (id: number, sendMessage = true) =>
    api.post(`/handover/${id}/release`, { sendMessage });
export const sendStaffReply = async (id: number, text: string) =>
    api.post(`/handover/${id}/reply`, { text });

export const getTemplates = async () =>
    (await api.get("/handover/templates")).data.templates as WhatsAppTemplate[];

export const sendTemplate = async (
    id: number,
    body: { name: string; language: string; params: string[]; preview: string }
) => api.post(`/handover/${id}/template`, body);

// ---------- Leads ----------
export const getLeads = async (params: Record<string, string | undefined> = {}) =>
    (await api.get("/leads", { params })).data.leads as LeadRow[];

export const getLeadStats = async () =>
    (await api.get("/leads/stats")).data.stats as LeadStats;

export const getLead = async (id: number) =>
    (await api.get(`/leads/${id}`)).data.lead as LeadDetail;

export const updateLead = async (id: number, body: { status?: string; notes?: string }) =>
    (await api.patch(`/leads/${id}`, body)).data.lead;

// ---------- Automations ----------
export const getAutomations = async () =>
    (await api.get("/automations")).data.automations as Automation[];

export const setAutomationActive = async (id: number, is_active: boolean) =>
    api.patch(`/automations/${id}`, { is_active });

export const getRuns = async (limit = 30) =>
    (await api.get("/automations/runs", { params: { limit } })).data.runs as AutomationRun[];

// ---------- Notifications ----------
export const getNotifications = async () =>
    (await api.get("/notifications", { params: { limit: 20 } })).data as {
        unread: number;
        notifications: Notification[];
    };

export const markNotificationRead = async (id: number) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = async () => api.post("/notifications/read-all");

// ---------- Knowledge base ----------
export const getCourses = async () => (await api.get("/kb/courses")).data.courses as Course[];
export const saveCourse = async (course: Partial<Course>) =>
    course.id ? api.patch(`/kb/courses/${course.id}`, course) : api.post("/kb/courses", course);
export const deleteCourse = async (id: number) => api.delete(`/kb/courses/${id}`);

export const getFaqs = async () => (await api.get("/kb/faqs")).data.faqs as Faq[];
export const saveFaq = async (faq: Partial<Faq>) =>
    faq.id ? api.patch(`/kb/faqs/${faq.id}`, faq) : api.post("/kb/faqs", faq);
export const deleteFaq = async (id: number) => api.delete(`/kb/faqs/${id}`);
