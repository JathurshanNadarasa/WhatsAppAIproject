"use client";

import Link from "next/link";

import Shell from "../components/console/Shell";
import { HeatBadge, HeatRail, ScoreBar } from "../components/console/Heat";
import { errorMessage, getLeads, getOverview, getQueue } from "../lib/api";
import { customerLabel, HANDOVER_LABEL, intentLabel, STATUS_LABEL, timeAgo } from "../lib/format";
import type { Overview } from "../lib/types";
import { usePoll } from "../lib/usePoll";


// People waiting for staff, then hot leads nobody has contacted
function WaitingForYou() {

    const { data, loading, error } = usePoll(async () => {
        const [queue, hot] = await Promise.all([
            getQueue(),
            getLeads({ temperature: "hot", sort: "score" }),
        ]);
        const inQueue = new Set(queue.map((q) => q.conversation_id));
        const toCall = hot
            .filter((l) => (l.status === "new" || l.status === "qualified") && !inQueue.has(l.conversation_id ?? -1))
            .slice(0, 6);
        return { queue, toCall };
    }, 15000);

    const empty = data && data.queue.length === 0 && data.toCall.length === 0;

    return (
        <section className="rounded-2xl border border-line bg-white">
            <div className="flex items-baseline justify-between px-6 pb-3 pt-5">
                <h2 className="text-lg font-semibold">Waiting for you</h2>
                <Link href="/inbox" className="text-sm text-staff hover:underline">Open inbox</Link>
            </div>

            {loading && !data && <p className="px-6 pb-6 text-sm text-ink-muted">Loading…</p>}
            {Boolean(error) && <p className="px-6 pb-6 text-sm text-hot">{errorMessage(error)}</p>}

            {empty && (
                <p className="px-6 pb-6 text-ink-soft">
                    Nobody is waiting. The bot is handling every open chat and all hot leads have been contacted.
                </p>
            )}

            <ul>
                {data?.queue.map((q) => (
                    <li key={`q${q.conversation_id}`} className="relative border-t border-line">
                        <HeatRail temperature={q.temperature} />
                        <Link href={`/inbox?c=${q.conversation_id}`} className="flex items-center gap-4 py-4 pl-6 pr-6 hover:bg-paper">
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                    <span className="font-semibold">{customerLabel(q.customer_name, q.customer_phone)}</span>
                                    <HeatBadge temperature={q.temperature} />
                                </span>
                                <span className="mt-0.5 block truncate text-sm text-ink-soft">
                                    “{q.last_customer_message || q.handover_reason}”
                                </span>
                            </span>
                            <span className="shrink-0 text-right text-sm">
                                <span className={`block font-semibold ${q.handover_status === "pending" ? "text-hot" : "text-staff"}`}>
                                    {HANDOVER_LABEL[q.handover_status]}
                                </span>
                                <span className="block text-ink-muted">
                                    {q.handover_status === "pending"
                                        ? `for ${q.waiting_minutes ?? 0} min`
                                        : q.assigned_user_name || "Not assigned"}
                                </span>
                            </span>
                        </Link>
                    </li>
                ))}

                {data?.toCall.map((l) => (
                    <li key={`l${l.id}`} className="relative border-t border-line">
                        <HeatRail temperature={l.temperature} />
                        <Link href={`/leads?lead=${l.id}`} className="flex items-center gap-4 py-4 pl-6 pr-6 hover:bg-paper">
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-x-2">
                                    <span className="font-semibold">{customerLabel(l.customer_name, l.customer_phone)}</span>
                                    {l.interested_courses.length > 0 && (
                                        <span className="text-sm text-ink-soft">{l.interested_courses.join(", ")}</span>
                                    )}
                                </span>
                                <span className="mt-0.5 block truncate text-sm text-ink-soft">
                                    {l.next_action || "Call to help them register"}
                                </span>
                            </span>
                            <span className="shrink-0 text-right text-sm">
                                <ScoreBar score={l.score} temperature={l.temperature} />
                                <span className="block text-ink-muted">{timeAgo(l.last_activity_at)}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}


function MessagesChart({ daily }: { daily: Overview["daily"] }) {

    const max = Math.max(1, ...daily.map((d) => d.customer + d.bot + d.staff));

    return (
        <figure>
            <div className="flex h-36 items-end gap-1" role="img" aria-label="Messages per day">
                {daily.map((d) => {
                    const total = d.customer + d.bot + d.staff;
                    const date = new Date(`${d.day}T00:00:00`);
                    return (
                        <div
                            key={d.day}
                            className="flex h-full flex-1 flex-col justify-end"
                            title={`${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${d.customer} customer, ${d.bot} bot, ${d.staff} staff`}
                        >
                            {total > 0 && (
                                <div className="flex flex-col overflow-hidden rounded-sm" style={{ height: `${(total / max) * 100}%` }}>
                                    <div className="bg-staff" style={{ flexGrow: d.staff }} />
                                    <div className="bg-bot" style={{ flexGrow: d.bot }} />
                                    <div className="bg-ink/25" style={{ flexGrow: d.customer }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <figcaption className="mt-3 flex flex-wrap gap-4 text-xs text-ink-soft">
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-ink/25" />From customers</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-bot" />Bot replies</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-staff" />Staff replies</span>
            </figcaption>
        </figure>
    );
}


function Pipeline({ leads }: { leads: Overview["leads"] }) {

    const steps = (["new", "contacted", "qualified", "registered"] as const).map((key) => ({
        key,
        value: leads[key],
    }));
    const max = Math.max(1, ...steps.map((s) => s.value));

    return (
        <>
            <ul className="space-y-3">
                {steps.map((s) => (
                    <li key={s.key}>
                        <Link href={`/leads?status=${s.key}`} className="flex items-center gap-3 text-sm hover:text-staff">
                            <span className="w-24 text-ink-soft">{STATUS_LABEL[s.key]}</span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                                <span className="block h-full rounded-full bg-ink" style={{ width: `${(s.value / max) * 100}%` }} />
                            </span>
                            <span className="w-8 text-right font-semibold">{s.value}</span>
                        </Link>
                    </li>
                ))}
            </ul>
            <p className="mt-4 text-sm text-ink-soft">
                Right now: <Link href="/leads?temperature=hot" className="font-medium text-hot hover:underline">{leads.hot} hot</Link>,{" "}
                <Link href="/leads?temperature=warm" className="font-medium text-warm hover:underline">{leads.warm} warm</Link>,{" "}
                <Link href="/leads?temperature=cold" className="font-medium text-cold hover:underline">{leads.cold} cold</Link>.
                {leads.lost > 0 && ` ${leads.lost} lost.`}
            </p>
        </>
    );
}


export default function OverviewPage() {

    const { data, error } = usePoll(() => getOverview(14), 60000);
    const t = data?.totals;

    return (
        <Shell title="Overview">

            {Boolean(error) && (
                <p role="alert" className="mb-6 rounded-lg bg-hot-soft px-4 py-3 text-sm text-hot">
                    {errorMessage(error, "Couldn't load the numbers.")}
                </p>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">

                <WaitingForYou />

                <section className="rounded-2xl border border-line bg-white p-6">
                    <h2 className="text-lg font-semibold">Last 14 days</h2>
                    {t && (
                        <dl className="mt-4 grid grid-cols-3 gap-4">
                            <div>
                                <dt className="text-sm text-ink-soft">People who wrote</dt>
                                <dd className="text-2xl font-semibold">{t.active_customers}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-ink-soft">Their messages</dt>
                                <dd className="text-2xl font-semibold">{t.customer_messages}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-ink-soft">Replies by the bot</dt>
                                <dd className="text-2xl font-semibold">{t.automation_rate == null ? "–" : `${t.automation_rate}%`}</dd>
                            </div>
                        </dl>
                    )}
                    <div className="mt-6">{data && <MessagesChart daily={data.daily} />}</div>
                </section>

                <section className="rounded-2xl border border-line bg-white p-6">
                    <h2 className="text-lg font-semibold">Lead pipeline</h2>
                    <div className="mt-4">{data && <Pipeline leads={data.leads} />}</div>
                </section>

                <div className="grid gap-6 sm:grid-cols-2">
                    <section className="rounded-2xl border border-line bg-white p-6">
                        <h2 className="text-lg font-semibold">Courses people want</h2>
                        <ul className="mt-4 space-y-2 text-sm">
                            {data && data.courses.length === 0 && <li className="text-ink-muted">No course interest yet.</li>}
                            {data?.courses.map((c) => (
                                <li key={c.course} className="flex justify-between gap-3">
                                    <Link href={`/leads?course=${encodeURIComponent(c.course)}`} className="truncate hover:text-staff">
                                        {c.course}
                                    </Link>
                                    <span className="shrink-0 text-ink-soft">
                                        {c.leads}
                                        {c.hot > 0 && <span className="ml-2 font-semibold text-hot">{c.hot} hot</span>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="rounded-2xl border border-line bg-white p-6">
                        <h2 className="text-lg font-semibold">What they ask about</h2>
                        <ul className="mt-4 space-y-2 text-sm">
                            {data?.intents
                                .filter((i) => i.intent !== "GREETING" && i.intent !== "GENERAL_INQUIRY")
                                .slice(0, 6)
                                .map((i) => (
                                    <li key={i.intent} className="flex justify-between gap-3">
                                        <span>{intentLabel(i.intent)}</span>
                                        <span className="text-ink-soft">{i.count}</span>
                                    </li>
                                ))}
                        </ul>
                        {data && (
                            <p className="mt-4 text-sm text-ink-soft">
                                {data.handover.requested} asked for a person in the last {data.days} days.
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </Shell>
    );
}
