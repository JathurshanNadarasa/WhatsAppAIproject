"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import Shell from "../../components/console/Shell";
import { HeatBadge, HeatRail } from "../../components/console/Heat";
import {
    assignConversation, errorMessage, getConversations, getMessages, getSummary, getTeam, getTemplates,
    regenerateSummary, releaseToBot, sendStaffReply, sendTemplate, takeOver,
} from "../../lib/api";
import { useSession } from "../../lib/session";
import { clockTime, customerLabel, dayLabel, HANDOVER_LABEL, intentLabel, timeAgo } from "../../lib/format";
import type { ChatMessage, ConversationRow, TeamMember, WhatsAppTemplate } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";


type Filter = "all" | "waiting" | "staff" | "mine";

const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "waiting", label: "Waiting for staff" },
    { key: "mine", label: "My chats" },
    { key: "staff", label: "Staff replying" },
];


function ConversationList({
    selectedId,
    onSelect,
}: {
    selectedId: number | null;
    onSelect: (id: number) => void;
}) {

    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");

    const { data, error } = usePoll(getConversations, 10000);
    const { userId } = useSession();

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (data ?? [])
            .filter((c) =>
                filter === "all" ? true
                    : filter === "waiting" ? c.handover_status === "pending"
                        : filter === "mine" ? c.assigned_user_id === userId && c.handover_status !== "bot"
                            : c.handover_status === "human")
            .filter((c) => !q || (c.customer_name || "").toLowerCase().includes(q) || c.customer_phone.includes(q));
    }, [data, filter, search, userId]);

    const waiting = (data ?? []).filter((c) => c.handover_status === "pending").length;

    return (
        <div className="flex h-full flex-col">
            <div className="space-y-3 border-b border-line p-4">
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or number"
                    aria-label="Search conversations"
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter conversations">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            role="tab"
                            aria-selected={filter === f.key}
                            onClick={() => setFilter(f.key)}
                            className={`rounded-full px-3 py-1 text-sm ${filter === f.key ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-line/60"}`}
                        >
                            {f.label}
                            {f.key === "waiting" && waiting > 0 && <span className="ml-1.5 font-semibold text-hot">{waiting}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {Boolean(error) && <p className="p-4 text-sm text-hot">{errorMessage(error)}</p>}

            <ul className="flex-1 overflow-y-auto">
                {data && rows.length === 0 && (
                    <li className="p-4 text-sm text-ink-muted">
                        {filter === "waiting" ? "Nobody is waiting for staff." : "No conversations here."}
                    </li>
                )}
                {rows.map((c) => (
                    <li key={c.id} className="relative border-b border-line">
                        <HeatRail temperature={c.temperature} />
                        <button
                            type="button"
                            onClick={() => onSelect(c.id)}
                            aria-current={selectedId === c.id ? "true" : undefined}
                            className={`block w-full py-3 pl-5 pr-4 text-left ${selectedId === c.id ? "bg-white" : "hover:bg-white/60"}`}
                        >
                            <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate font-medium">{customerLabel(c.customer_name, c.customer_phone)}</span>
                                <span className="shrink-0 text-xs text-ink-muted">{timeAgo(c.last_message_at)}</span>
                            </span>
                            <span className="mt-0.5 block truncate text-sm text-ink-soft">
                                {c.last_sender_type === "business" ? "Bot: " : c.last_sender_type === "staff" ? "You: " : ""}
                                {c.last_message_text || "…"}
                            </span>
                            {c.handover_status !== "bot" && (
                                <span className={`mt-1 inline-block text-xs font-semibold ${c.handover_status === "pending" ? "text-hot" : "text-staff"}`}>
                                    {HANDOVER_LABEL[c.handover_status]}
                                </span>
                            )}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}


const MEDIA_LABEL: Record<string, string> = {
    image: "Photo",
    audio: "Voice note",
    video: "Video",
    document: "Document",
    sticker: "Sticker",
    location: "Location",
    interactive: "Button reply",
    button: "Button reply",
    contacts: "Contact",
};


function Bubble({ m }: { m: ChatMessage }) {

    const mine = m.sender_type !== "customer";
    const tone =
        m.sender_type === "customer" ? "bg-white border border-line"
            : m.sender_type === "staff" ? "bg-staff-soft" : "bg-bot-soft";
    const who =
        m.sender_type === "staff" ? (m.sent_by_user_name || "Staff")
            : m.sender_type === "business" ? "Bot" : null;

    return (
        <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${tone}`}>
                {who && (
                    <p className={`mb-0.5 text-xs font-semibold ${m.sender_type === "staff" ? "text-staff" : "text-bot"}`}>{who}</p>
                )}
                {m.message_type !== "text" && m.message_text && (
                    <p className="mb-0.5 text-xs text-ink-muted">{MEDIA_LABEL[m.message_type] || m.message_type}</p>
                )}
                <p className="whitespace-pre-wrap break-words">
                    {m.message_text || (
                        <span className="italic text-ink-muted">{MEDIA_LABEL[m.message_type] || m.message_type}, no text</span>
                    )}
                </p>
                <p className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-ink-muted">
                    {m.template_name && <span>Template</span>}
                    {clockTime(m.created_at)}
                    {mine && <Ticks status={m.delivery_status} />}
                </p>
                {m.delivery_status === "failed" && m.delivery_error && (
                    <p className="mt-1 text-xs text-hot">Not delivered: {m.delivery_error}</p>
                )}
            </div>
        </div>
    );
}


// WhatsApp-style delivery ticks for our messages (C14)
function Ticks({ status }: { status: ChatMessage["delivery_status"] }) {

    if (!status) return null;

    const label = {
        pending: "Saved, not sent",
        sent: "Sent",
        delivered: "Delivered",
        read: "Read",
        failed: "Not delivered",
    }[status];

    if (status === "failed") return <span className="font-semibold text-hot" title={label}>!</span>;
    if (status === "pending") return <span title={label} aria-label={label}>○</span>;

    return (
        <span title={label} aria-label={label} className={status === "read" ? "text-staff" : ""}>
            {status === "sent" ? "✓" : "✓✓"}
        </span>
    );
}


// Pick an approved template and fill its {{1}} {{2}} values (C14)
function TemplateSender({ conversationId, onSent, onClose }: {
    conversationId: number;
    onSent: () => void;
    onClose: () => void;
}) {

    const [templates, setTemplates] = useState<WhatsAppTemplate[] | null>(null);
    const [chosen, setChosen] = useState<WhatsAppTemplate | null>(null);
    const [values, setValues] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getTemplates()
            .then((list) => { setTemplates(list); if (list[0]) { setChosen(list[0]); setValues(Array(list[0].params).fill("")); } })
            .catch((e) => setError(errorMessage(e, "Couldn't load templates.")));
    }, []);

    const preview = chosen
        ? chosen.body.replace(/\{\{(\d+)\}\}/g, (_, n) => values[Number(n) - 1] || `{{${n}}}`)
        : "";

    const send = async () => {
        if (!chosen) return;
        setBusy(true);
        setError("");
        try {
            await sendTemplate(conversationId, { name: chosen.name, language: chosen.language, params: values, preview });
            onSent();
        } catch (e) {
            setError(errorMessage(e, "Couldn't send the template."));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mb-3 space-y-3 rounded-xl border border-line bg-paper p-4">
            <div className="flex items-baseline justify-between">
                <p className="font-semibold">Send a template</p>
                <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:underline">Close</button>
            </div>
            <p className="text-sm text-ink-soft">
                Templates are approved by Meta and can be sent any time, even after 24 hours.
            </p>

            {templates && templates.length === 0 && (
                <p className="text-sm text-ink-muted">No approved templates yet. Create one in WhatsApp Manager first.</p>
            )}

            {templates && templates.length > 0 && (
                <>
                    <select
                        aria-label="Template"
                        value={chosen ? `${chosen.name}|${chosen.language}` : ""}
                        onChange={(e) => {
                            const t = templates.find((x) => `${x.name}|${x.language}` === e.target.value) || null;
                            setChosen(t);
                            setValues(Array(t?.params || 0).fill(""));
                        }}
                        className="w-full rounded-lg border border-line bg-white px-3 py-2"
                    >
                        {templates.map((t) => (
                            <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>{t.name} ({t.language})</option>
                        ))}
                    </select>

                    {values.map((v, i) => (
                        <input
                            key={i}
                            value={v}
                            onChange={(e) => setValues(values.map((x, j) => (j === i ? e.target.value : x)))}
                            placeholder={`Value for {{${i + 1}}}`}
                            aria-label={`Value ${i + 1}`}
                            className="w-full rounded-lg border border-line bg-white px-3 py-2"
                        />
                    ))}

                    <p className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm">{preview}</p>
                </>
            )}

            {error && <p role="alert" className="text-sm text-hot">{error}</p>}

            <button
                type="button"
                onClick={send}
                disabled={busy || !chosen || values.some((v) => !v.trim())}
                className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft disabled:opacity-50"
            >
                {busy ? "Sending…" : "Send template"}
            </button>
        </div>
    );
}


function Chat({ conversation, team, onChanged }: {
    conversation: ConversationRow;
    team: TeamMember[];
    onChanged: () => void;
}) {

    const id = conversation.id;
    const session = useSession();
    const assignee = team.find((m) => m.id === conversation.assigned_user_id);
    const { data: messages, refresh } = usePoll(() => getMessages(id), 5000, [id]);

    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{ kind: "error" | "info"; text: string } | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const bottom = useRef<HTMLLIElement>(null);

    useEffect(() => { setNotice(null); setText(""); setShowTemplates(false); }, [id]);
    useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);

    const run = async (fn: () => Promise<unknown>, done?: string) => {
        setBusy(true);
        setNotice(null);
        try {
            await fn();
            if (done) setNotice({ kind: "info", text: done });
            await refresh();
            onChanged();
        } catch (error) {
            setNotice({ kind: "error", text: errorMessage(error) });
        } finally {
            setBusy(false);
        }
    };

    const send = (e: React.FormEvent) => {
        e.preventDefault();
        const value = text.trim();
        if (!value) return;
        run(async () => { await sendStaffReply(id, value); setText(""); });
    };

    const status = conversation.handover_status;

    // Group messages by day
    let lastDay = "";

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-5 py-3">
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold">
                        {customerLabel(conversation.customer_name, conversation.customer_phone)}
                        <HeatBadge temperature={conversation.temperature} />
                    </p>
                    {conversation.customer_name && conversation.customer_name !== "WhatsApp Customer" && (
                        <p className="text-sm text-ink-muted">+{conversation.customer_phone.replace(/^\+/, "")}</p>
                    )}
                </div>

                <span className={`text-sm font-semibold ${status === "pending" ? "text-hot" : status === "human" ? "text-staff" : "text-bot"}`}>
                    {HANDOVER_LABEL[status]}
                    {assignee && status !== "bot" && (
                        <span className="block text-xs font-normal text-ink-muted">
                            {assignee.id === session.userId ? "Assigned to you" : `Assigned to ${assignee.name}`}
                        </span>
                    )}
                </span>

                {session.role === "admin" && (
                    <select
                        aria-label="Assign this chat"
                        value=""
                        disabled={busy}
                        onChange={(e) => {
                            const member = team.find((m) => m.id === Number(e.target.value));
                            if (member) run(() => assignConversation(id, member.id), `Assigned to ${member.name}. They got a notification.`);
                        }}
                        className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
                    >
                        <option value="">Assign to…</option>
                        {team.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}{m.id === session.userId ? " (you)" : ""}{m.open_chats ? `, ${m.open_chats} open` : ""}
                            </option>
                        ))}
                    </select>
                )}

                {status !== "human" && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => takeOver(id), "You're handling this chat. The bot will stay quiet.")}
                        className="rounded-lg bg-staff px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                    >
                        Take over
                    </button>
                )}
                {status !== "bot" && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => releaseToBot(id), "Handed back to the bot.")}
                        className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-paper disabled:opacity-60"
                    >
                        Hand back to bot
                    </button>
                )}
            </div>

            <ol className="flex-1 space-y-2 overflow-y-auto bg-paper px-5 py-4" aria-live="polite">
                {messages?.map((m) => {
                    const day = new Date(m.created_at).toDateString();
                    const showDay = day !== lastDay;
                    lastDay = day;
                    return (
                        <li key={m.id}>
                            {showDay && <p className="my-3 text-center text-xs text-ink-muted">{dayLabel(m.created_at)}</p>}
                            <Bubble m={m} />
                        </li>
                    );
                })}
                <li ref={bottom} aria-hidden />
            </ol>

            <form onSubmit={send} className="border-t border-line bg-white p-4">
                {showTemplates && (
                    <TemplateSender
                        conversationId={id}
                        onClose={() => setShowTemplates(false)}
                        onSent={() => { setShowTemplates(false); setNotice({ kind: "info", text: "Template sent." }); refresh(); onChanged(); }}
                    />
                )}
                {notice && (
                    <p role={notice.kind === "error" ? "alert" : "status"}
                        className={`mb-2 rounded-lg px-3 py-2 text-sm ${notice.kind === "error" ? "bg-hot-soft text-hot" : "bg-staff-soft text-staff"}`}>
                        {notice.text}
                        {notice.kind === "error" && /template/i.test(notice.text) && !showTemplates && (
                            <button type="button" onClick={() => setShowTemplates(true)} className="ml-2 font-semibold underline">
                                Send a template
                            </button>
                        )}
                    </p>
                )}
                <div className="flex items-end gap-2">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }
                        }}
                        rows={2}
                        placeholder={status === "bot" ? "Write a reply. Sending it takes the chat over from the bot." : "Write a reply"}
                        aria-label="Reply to customer"
                        className="min-h-11 flex-1 resize-y rounded-lg border border-line px-3 py-2"
                    />
                    <button
                        type="button"
                        onClick={() => setShowTemplates((v) => !v)}
                        className="rounded-lg border border-line px-3 py-2.5 text-sm hover:bg-paper"
                        aria-expanded={showTemplates}
                    >
                        Template
                    </button>
                    <button
                        type="submit"
                        disabled={busy || !text.trim()}
                        className="rounded-lg bg-ink px-4 py-2.5 font-medium text-white hover:bg-ink-soft disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}


function Context({ conversation }: { conversation: ConversationRow }) {

    const id = conversation.id;
    const { data: summary, refresh, setData } = usePoll(() => getSummary(id), 30000, [id]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const regenerate = async () => {
        setBusy(true);
        setError("");
        try {
            setData(await regenerateSummary(id));
        } catch (e) {
            setError(errorMessage(e, "Couldn't create the summary."));
        } finally {
            setBusy(false);
            refresh();
        }
    };

    return (
        <div className="h-full space-y-6 overflow-y-auto p-5">
            <section>
                <h2 className="font-semibold">Lead</h2>
                {conversation.lead_id ? (
                    <p className="mt-2 text-sm">
                        Score <span className="font-semibold">{conversation.score}</span>{" "}
                        <HeatBadge temperature={conversation.temperature} />
                        <Link href={`/leads?lead=${conversation.lead_id}`} className="ml-2 text-staff hover:underline">Open lead</Link>
                    </p>
                ) : (
                    <p className="mt-2 text-sm text-ink-muted">No lead yet.</p>
                )}
            </section>

            <section>
                <div className="flex items-baseline justify-between">
                    <h2 className="font-semibold">AI summary</h2>
                    <button type="button" onClick={regenerate} disabled={busy} className="text-sm text-staff hover:underline disabled:opacity-60">
                        {busy ? "Summarising…" : summary ? "Refresh" : "Summarise now"}
                    </button>
                </div>
                {error && <p className="mt-2 text-sm text-hot">{error}</p>}

                {!summary && !busy && (
                    <p className="mt-2 text-sm text-ink-muted">A summary appears after a few messages.</p>
                )}

                {summary && (
                    <div className="mt-2 space-y-4 text-sm">
                        <p className="leading-relaxed">{summary.summary}</p>

                        {summary.next_action && (
                            <div className="rounded-lg bg-staff-soft p-3">
                                <p className="font-semibold text-staff">Next step</p>
                                <p className="mt-0.5">{summary.next_action}</p>
                            </div>
                        )}

                        {summary.unanswered_questions.length > 0 && (
                            <div className="rounded-lg bg-hot-soft p-3">
                                <p className="font-semibold text-hot">Still needs an answer</p>
                                <ul className="mt-1 list-disc pl-4">
                                    {summary.unanswered_questions.map((q) => <li key={q}>{q}</li>)}
                                </ul>
                            </div>
                        )}

                        {summary.customer_requirements.length > 0 && (
                            <div>
                                <p className="font-semibold">What they want</p>
                                <ul className="mt-1 list-disc pl-4 text-ink-soft">
                                    {summary.customer_requirements.map((r) => <li key={r}>{r}</li>)}
                                </ul>
                            </div>
                        )}

                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-ink-soft">
                            {summary.interested_courses.length > 0 && (<><dt>Courses</dt><dd className="text-ink">{summary.interested_courses.join(", ")}</dd></>)}
                            {summary.primary_intent && (<><dt>Mainly about</dt><dd className="text-ink">{intentLabel(summary.primary_intent)}</dd></>)}
                            {summary.interest_level && (<><dt>Interest</dt><dd className="capitalize text-ink">{summary.interest_level}</dd></>)}
                            {summary.language && (<><dt>Language</dt><dd className="capitalize text-ink">{summary.language}</dd></>)}
                        </dl>

                        <p className="text-xs text-ink-muted">
                            Based on {summary.message_count} messages, updated {timeAgo(summary.updated_at)}
                            {summary.source === "rule" ? " (basic summary, AI was unavailable)" : ""}.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}


function Inbox() {

    const router = useRouter();
    const params = useSearchParams();
    const selectedId = params.get("c") ? Number(params.get("c")) : null;

    const { data: list, refresh } = usePoll(getConversations, 10000);
    const { data: team } = usePoll(() => getTeam(), 60000);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const selected = list?.find((c) => c.id === selectedId) ?? null;

    const select = (id: number) => router.replace(`/inbox?c=${id}`, { scroll: false });

    return (
        <Shell title="Inbox" fullHeight>
            <div className="grid h-full lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)_20rem]">

                <div className={`${selected ? "hidden lg:block" : "block"} h-full min-h-0 border-r border-line`}>
                    <ConversationList selectedId={selectedId} onSelect={select} />
                </div>

                {selected ? (
                    <>
                        <div className="flex h-full min-h-0 flex-col">
                            <div className="flex items-center justify-between border-b border-line px-5 py-2 text-sm xl:hidden">
                                <button type="button" onClick={() => router.replace("/inbox")} className="text-staff lg:invisible">
                                    Back to conversations
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDetailsOpen(true)}
                                    className="rounded-lg border border-line bg-white px-3 py-1 font-medium hover:bg-paper"
                                >
                                    AI summary & lead
                                </button>
                            </div>
                            <div className="min-h-0 flex-1">
                                <Chat conversation={selected} team={team ?? []} onChanged={refresh} />
                            </div>
                        </div>
                        <aside className="hidden h-full min-h-0 border-l border-line bg-white xl:block" aria-label="Customer details">
                            <Context conversation={selected} />
                        </aside>

                        {/* Smaller screens: same panel as a drawer */}
                        {detailsOpen && (
                            <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true" aria-label="AI summary and lead">
                                <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={() => setDetailsOpen(false)} />
                                <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-xl">
                                    <div className="flex items-center justify-between border-b border-line px-5 py-3">
                                        <p className="font-semibold">Customer details</p>
                                        <button type="button" onClick={() => setDetailsOpen(false)} className="rounded-lg px-2 py-1 text-sm hover:bg-paper">Close</button>
                                    </div>
                                    <div className="min-h-0 flex-1"><Context conversation={selected} /></div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="hidden items-center justify-center p-8 text-center text-ink-soft lg:flex">
                        Pick a conversation to read it and reply.
                    </div>
                )}
            </div>
        </Shell>
    );
}


export default function InboxPage() {
    return (
        <Suspense fallback={null}>
            <Inbox />
        </Suspense>
    );
}