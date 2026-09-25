"use client";

import Shell from "../../components/console/Shell";
import { errorMessage, getAutomations, getRuns, setAutomationActive } from "../../lib/api";
import { customerLabel, timeAgo } from "../../lib/format";
import type { Automation, AutomationRun } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";
import { useSession } from "../../lib/session";
import { useState } from "react";


const TRIGGER_TEXT: Record<string, string> = {
    message_received: "When a customer sends a message",
    lead_created: "When a new lead is created",
    lead_temperature_changed: "When a lead's temperature changes",
    lead_status_changed: "When a lead's status changes",
    summary_updated: "When the AI summary is updated",
    customer_inactive: "When a customer goes quiet",
    handover_requested: "When someone asks for staff",
};

const ACTION_TEXT: Record<string, string> = {
    notify_staff: "notify staff",
    send_whatsapp_message: "send a WhatsApp message",
    update_lead_status: "change the lead status",
    assign_lead: "assign the lead",
    add_lead_note: "add a note to the lead",
    request_handover: "hand the chat to staff",
};

const OP_TEXT: Record<string, string> = {
    eq: "is", neq: "is not", gt: "is more than", gte: "is at least", lt: "is less than",
    lte: "is at most", in: "is one of", not_in: "is not one of", contains: "contains", exists: "is set",
};

const FIELD_TEXT: Record<string, string> = {
    "lead.temperature": "lead temperature",
    "lead.status": "lead status",
    "lead.score": "lead score",
    intent: "the message",
    hours_inactive: "hours without reply",
    "summary.unanswered_count": "unanswered questions",
    "event.new": "the new value",
};

const describeCondition = (c: Automation["conditions"][number]) => {
    const value = Array.isArray(c.value) ? c.value.join(" or ") : String(c.value ?? "");
    return `${FIELD_TEXT[c.field] || c.field} ${OP_TEXT[c.op] || c.op} ${value}`.trim();
};

const RUN_STYLE: Record<AutomationRun["status"], string> = {
    success: "text-bot",
    failed: "text-hot",
    skipped: "text-ink-muted",
    scheduled: "text-warm",
    running: "text-staff",
};

const runDetail = (r: AutomationRun) => {
    const action = r.result?.actions?.find((a) => !a.ok);
    if (action && typeof action.detail === "string") return action.detail;
    return r.result?.reason || "";
};


function AutomationCard({ a, onToggle, canEdit }: { a: Automation; onToggle: (a: Automation) => void; canEdit: boolean }) {
    return (
        <li className={`rounded-2xl border border-line bg-white p-5 ${a.is_active ? "" : "opacity-70"}`}>
            <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                    <p className="font-semibold">{a.name}</p>
                    {a.description && <p className="mt-0.5 text-sm text-ink-soft">{a.description}</p>}
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                    <span className="text-ink-soft">{a.is_active ? "On" : "Off"}</span>
                    <input
                        type="checkbox"
                        role="switch"
                        checked={a.is_active}
                        disabled={!canEdit}
                        onChange={() => onToggle(a)}
                        aria-label={`${a.is_active ? "Turn off" : "Turn on"} ${a.name}`}
                        className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-line transition-colors before:block before:h-4 before:w-4 before:translate-x-0.5 before:rounded-full before:bg-white before:transition-transform checked:bg-bot checked:before:translate-x-[18px]"
                    />
                </label>
            </div>

            <p className="mt-3 text-sm">
                {TRIGGER_TEXT[a.trigger_type] || a.trigger_type}
                {a.conditions.length > 0 && <> and {a.conditions.map(describeCondition).join(", and ")}</>}
                {", "}
                {a.delay_minutes > 0 && <>wait {a.delay_minutes} min, then </>}
                {a.actions.map((x) => ACTION_TEXT[x.type] || x.type).join(" and ")}.
            </p>

            <p className="mt-2 text-xs text-ink-muted">
                Ran {a.success_count} {a.success_count === 1 ? "time" : "times"}
                {a.last_run_at && `, last ${timeAgo(a.last_run_at)}`}
                {a.cooldown_minutes < 0 && ". Once per conversation"}
                {a.cooldown_minutes > 0 && `. At most once every ${a.cooldown_minutes >= 60 ? `${Math.round(a.cooldown_minutes / 60)} h` : `${a.cooldown_minutes} min`} per person`}
            </p>
        </li>
    );
}


export default function AutomationsPage() {

    const { data: automations, error, setData } = usePoll(getAutomations, 60000);
    const { data: runs } = usePoll(() => getRuns(30), 20000);
    const [problem, setProblem] = useState("");
    const { role } = useSession();
    const canEdit = role === "admin";

    const toggle = async (a: Automation) => {
        setProblem("");
        setData((list) => list?.map((x) => (x.id === a.id ? { ...x, is_active: !a.is_active } : x)) ?? null);
        try {
            await setAutomationActive(a.id, !a.is_active);
        } catch (e) {
            setData((list) => list?.map((x) => (x.id === a.id ? { ...x, is_active: a.is_active } : x)) ?? null);
            setProblem(errorMessage(e, "Couldn't change the automation."));
        }
    };

    return (
        <Shell title="Automations">
            {(Boolean(error) || problem) && (
                <p role="alert" className="mb-4 rounded-lg bg-hot-soft px-4 py-3 text-sm text-hot">{problem || errorMessage(error)}</p>
            )}

            {!canEdit && (
                <p className="mb-4 text-sm text-ink-soft">Only admins can turn automations on or off.</p>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <ul className="space-y-4">
                    {automations?.map((a) => <AutomationCard key={a.id} a={a} onToggle={toggle} canEdit={canEdit} />)}
                </ul>

                <section className="self-start rounded-2xl border border-line bg-white">
                    <h2 className="px-5 pb-2 pt-4 font-semibold">Recent activity</h2>
                    <ul className="max-h-[70vh] overflow-y-auto">
                        {runs && runs.length === 0 && <li className="px-5 pb-5 text-sm text-ink-muted">Nothing has run yet.</li>}
                        {runs?.map((r) => (
                            <li key={r.id} className="border-t border-line px-5 py-3 text-sm">
                                <p className="flex justify-between gap-3">
                                    <span className="font-medium">{r.automation_name}</span>
                                    <span className={`capitalize ${RUN_STYLE[r.status]}`}>{r.status}</span>
                                </p>
                                <p className="text-ink-soft">
                                    {r.customer_phone ? customerLabel(r.customer_name, r.customer_phone) : "–"}, {timeAgo(r.created_at)}
                                </p>
                                {runDetail(r) && <p className="mt-0.5 text-xs text-ink-muted">{runDetail(r)}</p>}
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </Shell>
    );
}
