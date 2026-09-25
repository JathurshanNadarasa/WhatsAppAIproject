"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import Shell from "../../components/console/Shell";
import { HeatBadge, HeatRail, ScoreBar } from "../../components/console/Heat";
import { errorMessage, getLead, getLeads, getLeadStats, updateLead } from "../../lib/api";
import { breakdownLabel, customerLabel, STATUS_LABEL, timeAgo } from "../../lib/format";
import type { LeadStatus, Temperature } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";


const STATUSES = Object.keys(STATUS_LABEL) as LeadStatus[];
const TEMPS: Temperature[] = ["hot", "warm", "cold"];

const EVENT_TEXT = (e: { event_type: string; old_value: string | null; new_value: string | null }) => {
    switch (e.event_type) {
        case "created": return `Lead created (${e.new_value})`;
        case "status_changed": return `Status: ${STATUS_LABEL[e.old_value as LeadStatus] ?? e.old_value} to ${STATUS_LABEL[e.new_value as LeadStatus] ?? e.new_value}`;
        case "temperature_changed": return `Became ${e.new_value}`;
        case "note_added": return `Note: ${e.new_value}`;
        default: return e.event_type;
    }
};


function LeadPanel({ id, onClose, onSaved }: { id: number; onClose: () => void; onSaved: () => void }) {

    const { data: lead, refresh, error } = usePoll(() => getLead(id), 30000, [id]);

    const [status, setStatus] = useState<LeadStatus | "">("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        if (lead) { setStatus(lead.status); setNotes(lead.notes || ""); }
    }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const save = async () => {
        if (!lead) return;
        setSaving(true);
        setMessage(null);
        try {
            const body: { status?: string; notes?: string } = {};
            if (status && status !== lead.status) body.status = status;
            if (notes !== (lead.notes || "")) body.notes = notes;
            if (Object.keys(body).length === 0) { setMessage({ ok: true, text: "Nothing changed." }); return; }
            await updateLead(lead.id, body);
            setMessage({ ok: true, text: "Lead saved." });
            await refresh();
            onSaved();
        } catch (e) {
            setMessage({ ok: false, text: errorMessage(e) });
        } finally {
            setSaving(false);
        }
    };

    const breakdown = lead ? Object.entries(lead.score_breakdown || {}).sort((a, b) => b[1] - a[1]) : [];

    return (
        <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-line bg-white shadow-xl" aria-label="Lead details">
            <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
                <div>
                    <p className="text-lg font-semibold">{lead ? customerLabel(lead.customer_name, lead.customer_phone) : "Lead"}</p>
                    {lead && <p className="text-sm text-ink-muted">+{lead.customer_phone.replace(/^\+/, "")}</p>}
                </div>
                <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm hover:bg-paper">Close</button>
            </div>

            {Boolean(error) && <p className="p-6 text-sm text-hot">{errorMessage(error)}</p>}

            {lead && (
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    <div className="flex items-center gap-3">
                        <HeatBadge temperature={lead.temperature} />
                        <ScoreBar score={lead.score} temperature={lead.temperature} />
                        {lead.conversation_id && (
                            <Link href={`/inbox?c=${lead.conversation_id}`} className="ml-auto text-sm text-staff hover:underline">Open chat</Link>
                        )}
                    </div>

                    {lead.interested_courses.length > 0 && (
                        <p className="text-sm">Interested in <span className="font-medium">{lead.interested_courses.join(", ")}</span></p>
                    )}

                    {lead.summary?.next_action && (
                        <div className="rounded-lg bg-staff-soft p-3 text-sm">
                            <p className="font-semibold text-staff">Next step</p>
                            <p className="mt-0.5">{lead.summary.next_action}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="block">
                            <span className="text-sm font-medium">Status</span>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
                            >
                                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium">Notes</span>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Called on Monday, will visit the office…"
                                className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                            />
                        </label>
                        {message && (
                            <p role="status" className={`text-sm ${message.ok ? "text-bot" : "text-hot"}`}>{message.text}</p>
                        )}
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft disabled:opacity-60"
                        >
                            {saving ? "Saving…" : "Save lead"}
                        </button>
                    </div>

                    {lead.summary && (
                        <section>
                            <h3 className="font-semibold">AI summary</h3>
                            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{lead.summary.summary}</p>
                        </section>
                    )}

                    <section>
                        <h3 className="font-semibold">Why this score</h3>
                        <ul className="mt-2 space-y-1 text-sm">
                            {breakdown.length === 0 && <li className="text-ink-muted">No signals yet.</li>}
                            {breakdown.map(([key, points]) => (
                                <li key={key} className="flex justify-between">
                                    <span className="text-ink-soft">{breakdownLabel(key)}</span>
                                    <span className={points < 0 ? "text-hot" : "font-medium"}>{points > 0 ? `+${points}` : points}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-semibold">History</h3>
                        <ol className="mt-2 space-y-2 border-l border-line pl-4 text-sm">
                            {lead.events.map((e) => (
                                <li key={e.id}>
                                    <p>{EVENT_TEXT(e)}</p>
                                    <p className="text-xs text-ink-muted">{e.user_name || "Automatic"}, {timeAgo(e.created_at)}</p>
                                </li>
                            ))}
                        </ol>
                    </section>
                </div>
            )}
        </aside>
    );
}


function Leads() {

    const router = useRouter();
    const params = useSearchParams();

    const temperature = params.get("temperature") || undefined;
    const status = params.get("status") || undefined;
    const course = params.get("course") || undefined;
    const openId = params.get("lead") ? Number(params.get("lead")) : null;

    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");

    useEffect(() => {
        const t = window.setTimeout(() => setQuery(search.trim()), 300);
        return () => window.clearTimeout(t);
    }, [search]);

    const { data: stats, refresh: refreshStats } = usePoll(getLeadStats, 30000);
    const { data: leads, error, refresh } = usePoll(
        () => getLeads({ temperature, status, course, search: query || undefined, sort: "score" }),
        30000,
        [temperature, status, course, query]
    );

    const setParam = (key: string, value?: string) => {
        const next = new URLSearchParams(params.toString());
        if (value && next.get(key) !== value) next.set(key, value); else next.delete(key);
        if (key !== "lead") next.delete("lead");
        router.replace(`/leads${next.toString() ? `?${next}` : ""}`, { scroll: false });
    };

    const chip = (active: boolean) =>
        `rounded-full px-3 py-1 text-sm ${active ? "bg-ink text-white" : "border border-line bg-white text-ink-soft hover:bg-line/40"}`;

    return (
        <Shell title="Leads">

            <div className="mb-5 flex flex-wrap items-center gap-2">
                {TEMPS.map((t) => (
                    <button key={t} type="button" onClick={() => setParam("temperature", t)} className={chip(temperature === t)} aria-pressed={temperature === t}>
                        <span className="capitalize">{t}</span>
                        {stats && <span className="ml-1.5 font-semibold">{stats[t]}</span>}
                    </button>
                ))}
                <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
                {STATUSES.map((s) => (
                    <button key={s} type="button" onClick={() => setParam("status", s)} className={chip(status === s)} aria-pressed={status === s}>
                        {STATUS_LABEL[s]}
                        {stats && <span className="ml-1.5 font-semibold">{stats[s]}</span>}
                    </button>
                ))}
                {course && (
                    <button type="button" onClick={() => setParam("course")} className={chip(true)}>
                        {course} (clear)
                    </button>
                )}
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or number"
                    aria-label="Search leads"
                    className="ml-auto w-full rounded-lg border border-line bg-white px-3 py-1.5 text-sm sm:w-56"
                />
            </div>

            {Boolean(error) && <p role="alert" className="mb-4 rounded-lg bg-hot-soft px-4 py-3 text-sm text-hot">{errorMessage(error)}</p>}

            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[42rem] text-left text-sm">
                    <thead className="border-b border-line text-ink-muted">
                        <tr>
                            <th className="py-3 pl-6 pr-3 font-medium">Person</th>
                            <th className="px-3 font-medium">Course</th>
                            <th className="px-3 font-medium">Score</th>
                            <th className="px-3 font-medium">Status</th>
                            <th className="px-3 font-medium">Next step</th>
                            <th className="pr-6 pl-3 font-medium">Last active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads && leads.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-8 text-ink-muted">No leads match these filters.</td></tr>
                        )}
                        {leads?.map((l) => (
                            <tr
                                key={l.id}
                                onClick={() => setParam("lead", String(l.id))}
                                className={`relative cursor-pointer border-b border-line last:border-0 hover:bg-paper ${openId === l.id ? "bg-paper" : ""}`}
                            >
                                <td className="relative py-3 pl-6 pr-3">
                                    <HeatRail temperature={l.temperature} />
                                    <button type="button" className="text-left font-medium hover:underline" onClick={(e) => { e.stopPropagation(); setParam("lead", String(l.id)); }}>
                                        {customerLabel(l.customer_name, l.customer_phone)}
                                    </button>
                                </td>
                                <td className="px-3 text-ink-soft">{l.interested_courses.join(", ") || "–"}</td>
                                <td className="px-3"><ScoreBar score={l.score} temperature={l.temperature} /></td>
                                <td className="px-3">{STATUS_LABEL[l.status]}</td>
                                <td className="max-w-[16rem] truncate px-3 text-ink-soft" title={l.next_action || ""}>{l.next_action || "–"}</td>
                                <td className="whitespace-nowrap pl-3 pr-6 text-ink-muted">{timeAgo(l.last_activity_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {openId && (
                <LeadPanel
                    id={openId}
                    onClose={() => setParam("lead")}
                    onSaved={() => { refresh(); refreshStats(); }}
                />
            )}
        </Shell>
    );
}


export default function LeadsPage() {
    return (
        <Suspense fallback={null}>
            <Leads />
        </Suspense>
    );
}
