import type { HandoverStatus, LeadStatus, SenderType } from "./types";

export const customerLabel = (name: string | null | undefined, phone: string) =>
    name && name !== "WhatsApp Customer" ? name : `+${phone.replace(/^\+/, "")}`;

export const timeAgo = (value: string | null | undefined) => {
    if (!value) return "";
    const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "yesterday" : `${days} days ago`;
};

export const clockTime = (value: string) =>
    new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export const dayLabel = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export const intentLabel = (intent: string | null | undefined) =>
    ({
        GREETING: "Greeting",
        COURSE_INQUIRY: "Course details",
        FEE_INQUIRY: "Fees",
        DURATION_INQUIRY: "Duration",
        SCHEDULE_INQUIRY: "Schedule",
        REQUIREMENT_INQUIRY: "Requirements",
        LOCATION_INQUIRY: "Location",
        ONLINE_CLASS_INQUIRY: "Online classes",
        PAYMENT_INQUIRY: "Payment",
        REGISTRATION: "Wants to register",
        HUMAN_HANDOVER: "Asked for staff",
        GENERAL_INQUIRY: "General question",
    } as Record<string, string>)[intent || ""] || intent || "";

export const STATUS_LABEL: Record<LeadStatus, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    registered: "Registered",
    lost: "Lost",
};

export const HANDOVER_LABEL: Record<HandoverStatus, string> = {
    bot: "Bot replying",
    pending: "Waiting for staff",
    human: "Staff replying",
};

export const SENDER_LABEL: Record<SenderType, string> = {
    customer: "Customer",
    business: "Bot",
    staff: "Staff",
};

export const money = (value: string | number | null) => {
    if (value == null || value === "") return "";
    const n = Number(value);
    return Number.isNaN(n) ? String(value) : `LKR ${n.toLocaleString("en-LK")}`;
};

export const breakdownLabel = (key: string) =>
    ({
        course_identified: "Course identified",
        name_shared: "Shared their name",
        engagement: "Kept chatting",
        ai_interest: "AI summary: high interest",
        inactive: "Went quiet",
    } as Record<string, string>)[key] || intentLabel(key);
