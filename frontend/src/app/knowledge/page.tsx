"use client";

import { useState } from "react";

import Shell from "../../components/console/Shell";
import { deleteCourse, deleteFaq, errorMessage, getCourses, getFaqs, saveCourse, saveFaq } from "../../lib/api";
import { money } from "../../lib/format";
import type { Course, Faq } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";
import { useSession } from "../../lib/session";


const input = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
        <label className="block">
            <span className="text-sm font-medium">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
        </label>
    );
}


function CourseForm({ initial, onDone }: { initial: Partial<Course>; onDone: (saved: boolean) => void }) {

    const [c, setC] = useState<Partial<Course>>(initial);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const set = (key: keyof Course) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setC({ ...c, [key]: e.target.value });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try { await saveCourse(c); onDone(true); }
        catch (err) { setError(errorMessage(err, "Couldn't save the course.")); }
        finally { setBusy(false); }
    };

    return (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-staff/40 bg-white p-5">
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Course name"><input required value={c.name || ""} onChange={set("name")} className={input} /></Field>
                <Field label="Fee (LKR)" hint="Leave empty if the bot should say staff will confirm.">
                    <input inputMode="decimal" value={c.fee ?? ""} onChange={set("fee")} className={input} />
                </Field>
                <Field label="Duration"><input value={c.duration || ""} onChange={set("duration")} placeholder="3 months" className={input} /></Field>
                <Field label="Schedule"><input value={c.schedule || ""} onChange={set("schedule")} placeholder="Weekday and weekend batches" className={input} /></Field>
            </div>
            <Field label="What it covers"><textarea rows={2} value={c.description || ""} onChange={set("description")} className={input} /></Field>
            <Field label="Requirements"><input value={c.requirements || ""} onChange={set("requirements")} className={input} /></Field>
            <Field label="Status">
                <select value={c.status || "active"} onChange={set("status")} className={input}>
                    <option value="active">Active: the bot talks about it</option>
                    <option value="inactive">Hidden from the bot</option>
                </select>
            </Field>
            {error && <p role="alert" className="text-sm text-hot">{error}</p>}
            <div className="flex gap-2">
                <button type="submit" disabled={busy} className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft disabled:opacity-60">
                    {busy ? "Saving…" : "Save course"}
                </button>
                <button type="button" onClick={() => onDone(false)} className="rounded-lg border border-line px-4 py-2 hover:bg-paper">Cancel</button>
            </div>
        </form>
    );
}


function FaqForm({ initial, onDone }: { initial: Partial<Faq>; onDone: (saved: boolean) => void }) {

    const [f, setF] = useState<Partial<Faq>>(initial);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const set = (key: keyof Faq) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setF({ ...f, [key]: e.target.value });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try { await saveFaq(f); onDone(true); }
        catch (err) { setError(errorMessage(err, "Couldn't save the question.")); }
        finally { setBusy(false); }
    };

    return (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-staff/40 bg-white p-5">
            <Field label="Question"><input required value={f.question || ""} onChange={set("question")} className={input} /></Field>
            <Field label="Answer" hint="The bot uses this wording, so write it the way you'd say it to a customer.">
                <textarea required rows={3} value={f.answer || ""} onChange={set("answer")} className={input} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Category"><input value={f.category || ""} onChange={set("category")} placeholder="payment" className={input} /></Field>
                <Field label="Status">
                    <select value={f.status || "active"} onChange={set("status")} className={input}>
                        <option value="active">Active</option>
                        <option value="inactive">Hidden from the bot</option>
                    </select>
                </Field>
            </div>
            {error && <p role="alert" className="text-sm text-hot">{error}</p>}
            <div className="flex gap-2">
                <button type="submit" disabled={busy} className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft disabled:opacity-60">
                    {busy ? "Saving…" : "Save question"}
                </button>
                <button type="button" onClick={() => onDone(false)} className="rounded-lg border border-line px-4 py-2 hover:bg-paper">Cancel</button>
            </div>
        </form>
    );
}


export default function KnowledgePage() {

    const courses = usePoll(getCourses, 120000);
    const faqs = usePoll(getFaqs, 120000);

    const [editCourse, setEditCourse] = useState<Partial<Course> | null>(null);
    const [editFaq, setEditFaq] = useState<Partial<Faq> | null>(null);
    const [problem, setProblem] = useState("");
    const { role } = useSession();
    const canEdit = role === "admin";

    const remove = async (kind: "course" | "faq", id: number, label: string) => {
        if (!window.confirm(`Delete "${label}"? The bot will stop using it. To keep it for later, set it to hidden instead.`)) return;
        setProblem("");
        try {
            if (kind === "course") { await deleteCourse(id); courses.refresh(); }
            else { await deleteFaq(id); faqs.refresh(); }
        } catch (e) {
            setProblem(errorMessage(e, "Couldn't delete it."));
        }
    };

    return (
        <Shell title="Courses & FAQs">
            <p className="mb-6 max-w-2xl text-ink-soft">
                The bot answers only from what is here. If a fee or date is missing, it tells customers the team will confirm instead of guessing.
                {!canEdit && " Only admins can change this list."}
            </p>

            {problem && <p role="alert" className="mb-4 rounded-lg bg-hot-soft px-4 py-3 text-sm text-hot">{problem}</p>}

            <div className="grid gap-8 xl:grid-cols-2">
                <section>
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-lg font-semibold">Courses</h2>
                        {canEdit && !editCourse && (
                            <button type="button" onClick={() => setEditCourse({ status: "active" })} className="text-sm font-medium text-staff hover:underline">
                                Add course
                            </button>
                        )}
                    </div>

                    {editCourse && !editCourse.id && (
                        <div className="mb-4"><CourseForm initial={editCourse} onDone={(s) => { setEditCourse(null); if (s) courses.refresh(); }} /></div>
                    )}

                    <ul className="space-y-3">
                        {courses.data?.length === 0 && <li className="text-sm text-ink-muted">No courses yet. Add your first one so the bot can talk about it.</li>}
                        {courses.data?.map((c) =>
                            editCourse?.id === c.id ? (
                                <li key={c.id}><CourseForm initial={editCourse} onDone={(s) => { setEditCourse(null); if (s) courses.refresh(); }} /></li>
                            ) : (
                                <li key={c.id} className={`rounded-2xl border border-line bg-white p-5 ${c.status === "inactive" ? "opacity-60" : ""}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold">{c.name}{c.status === "inactive" && <span className="ml-2 text-sm font-normal text-ink-muted">hidden</span>}</p>
                                            <p className="mt-0.5 text-sm text-ink-soft">
                                                {[c.duration, money(c.fee) || "Fee not set", c.schedule].filter(Boolean).join(". ")}
                                            </p>
                                            {c.description && <p className="mt-2 text-sm">{c.description}</p>}
                                        </div>
                                        {canEdit && <div className="flex shrink-0 gap-3 text-sm">
                                            <button type="button" onClick={() => setEditCourse(c)} className="text-staff hover:underline">Edit</button>
                                            <button type="button" onClick={() => remove("course", c.id, c.name)} className="text-hot hover:underline">Delete</button>
                                        </div>}
                                    </div>
                                </li>
                            )
                        )}
                    </ul>
                </section>

                <section>
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-lg font-semibold">Questions people ask</h2>
                        {canEdit && !editFaq && (
                            <button type="button" onClick={() => setEditFaq({ status: "active" })} className="text-sm font-medium text-staff hover:underline">
                                Add question
                            </button>
                        )}
                    </div>

                    {editFaq && !editFaq.id && (
                        <div className="mb-4"><FaqForm initial={editFaq} onDone={(s) => { setEditFaq(null); if (s) faqs.refresh(); }} /></div>
                    )}

                    <ul className="space-y-3">
                        {faqs.data?.length === 0 && <li className="text-sm text-ink-muted">No questions yet.</li>}
                        {faqs.data?.map((f) =>
                            editFaq?.id === f.id ? (
                                <li key={f.id}><FaqForm initial={editFaq} onDone={(s) => { setEditFaq(null); if (s) faqs.refresh(); }} /></li>
                            ) : (
                                <li key={f.id} className={`rounded-2xl border border-line bg-white p-5 ${f.status === "inactive" ? "opacity-60" : ""}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold">{f.question}</p>
                                            <p className="mt-1 text-sm text-ink-soft">{f.answer}</p>
                                            {f.category && <p className="mt-2 text-xs text-ink-muted">{f.category}</p>}
                                        </div>
                                        {canEdit && <div className="flex shrink-0 gap-3 text-sm">
                                            <button type="button" onClick={() => setEditFaq(f)} className="text-staff hover:underline">Edit</button>
                                            <button type="button" onClick={() => remove("faq", f.id, f.question)} className="text-hot hover:underline">Delete</button>
                                        </div>}
                                    </div>
                                </li>
                            )
                        )}
                    </ul>
                </section>
            </div>
        </Shell>
    );
}
