"use client";

import { useState } from "react";

import Shell from "../../components/console/Shell";
import { addTeamMember, errorMessage, getTeam, updateTeamMember } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import { useSession } from "../../lib/session";
import type { Role, TeamMember } from "../../lib/types";
import { usePoll } from "../../lib/usePoll";


const input = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";

const ROLE_HELP: Record<Role, string> = {
    admin: "Everything, including team, automations and courses",
    staff: "Inbox and leads. Can take chats for themselves",
};


function AddMember({ onAdded }: { onAdded: () => void }) {

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm({ ...form, [key]: e.target.value });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await addTeamMember(form);
            setForm({ name: "", email: "", password: "", role: "staff" });
            setOpen(false);
            onAdded();
        } catch (err) {
            setError(errorMessage(err, "Couldn't add this person."));
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft">
                Add team member
            </button>
        );
    }

    return (
        <form onSubmit={submit} className="max-w-2xl space-y-3 rounded-2xl border border-staff/40 bg-white p-5">
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="text-sm font-medium">Name</span>
                    <input required value={form.name} onChange={set("name")} className={input} /></label>
                <label className="block"><span className="text-sm font-medium">Email</span>
                    <input required type="email" value={form.email} onChange={set("email")} className={input} autoComplete="off" /></label>
                <label className="block"><span className="text-sm font-medium">First password</span>
                    <input required minLength={8} type="text" value={form.password} onChange={set("password")} className={input} autoComplete="new-password" />
                    <span className="mt-1 block text-xs text-ink-muted">At least 8 characters. Share it with them privately.</span></label>
                <label className="block"><span className="text-sm font-medium">Role</span>
                    <select value={form.role} onChange={set("role")} className={input}>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                    </select>
                    <span className="mt-1 block text-xs text-ink-muted">{ROLE_HELP[form.role as Role]}</span></label>
            </div>
            {error && <p role="alert" className="text-sm text-hot">{error}</p>}
            <div className="flex gap-2">
                <button type="submit" disabled={busy} className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft disabled:opacity-60">
                    {busy ? "Adding…" : "Add member"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 hover:bg-paper">Cancel</button>
            </div>
        </form>
    );
}


function MemberRow({ m, isMe, onChanged }: { m: TeamMember; isMe: boolean; onChanged: (text: string, ok: boolean) => void }) {

    const [busy, setBusy] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [password, setPassword] = useState("");

    const change = async (body: Parameters<typeof updateTeamMember>[1], done: string) => {
        setBusy(true);
        try {
            await updateTeamMember(m.id, body);
            onChanged(done, true);
        } catch (e) {
            onChanged(errorMessage(e, "Couldn't update."), false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <tr className={`border-b border-line last:border-0 ${m.is_active ? "" : "text-ink-muted"}`}>
            <td className="py-3 pl-6 pr-3">
                <p className="font-medium">{m.name}{isMe && <span className="ml-2 text-sm font-normal text-ink-muted">you</span>}</p>
                <p className="text-sm text-ink-muted">{m.email}</p>
            </td>
            <td className="px-3">
                <select
                    aria-label={`Role for ${m.name}`}
                    value={m.role}
                    disabled={busy || !m.is_active}
                    onChange={(e) => change({ role: e.target.value }, `${m.name} is now ${e.target.value}.`)}
                    className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
                >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                </select>
            </td>
            <td className="px-3 text-sm">{m.is_active ? `${m.open_chats} open` : "–"}</td>
            <td className="px-3 text-sm">{m.last_login_at ? timeAgo(m.last_login_at) : "Never"}</td>
            <td className="py-3 pl-3 pr-6 text-right text-sm">
                {resetting ? (
                    <span className="inline-flex items-center gap-2">
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="New password"
                            aria-label={`New password for ${m.name}`}
                            className="w-36 rounded-lg border border-line px-2 py-1"
                        />
                        <button type="button" disabled={busy || password.length < 8}
                            onClick={async () => { await change({ password }, `Password changed for ${m.name}.`); setResetting(false); setPassword(""); }}
                            className="text-staff hover:underline disabled:opacity-50">Save</button>
                        <button type="button" onClick={() => setResetting(false)} className="text-ink-soft hover:underline">Cancel</button>
                    </span>
                ) : (
                    <span className="inline-flex gap-4">
                        <button type="button" onClick={() => setResetting(true)} className="text-staff hover:underline">Reset password</button>
                        {!isMe && (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                    if (m.is_active && !window.confirm(`Deactivate ${m.name}? They are signed out now and their open chats go back to the queue.`)) return;
                                    change({ is_active: !m.is_active }, m.is_active ? `${m.name} was deactivated.` : `${m.name} can sign in again.`);
                                }}
                                className={m.is_active ? "text-hot hover:underline" : "text-bot hover:underline"}
                            >
                                {m.is_active ? "Deactivate" : "Reactivate"}
                            </button>
                        )}
                    </span>
                )}
            </td>
        </tr>
    );
}


export default function TeamPage() {

    const session = useSession();
    const { data: team, error, refresh } = usePoll(() => getTeam(true), 60000);
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

    if (session.role !== "admin") {
        return (
            <Shell title="Team">
                <p className="text-ink-soft">Only admins can manage the team.</p>
            </Shell>
        );
    }

    return (
        <Shell title="Team">
            <p className="mb-5 max-w-2xl text-ink-soft">
                Everyone here can reply to customers. Admins can also change automations, courses and the team.
            </p>

            <div className="mb-6"><AddMember onAdded={() => { setNotice({ ok: true, text: "Team member added." }); refresh(); }} /></div>

            {(Boolean(error) || notice) && (
                <p role={notice?.ok ? "status" : "alert"}
                    className={`mb-4 rounded-lg px-4 py-3 text-sm ${notice?.ok ? "bg-bot-soft text-bot" : "bg-hot-soft text-hot"}`}>
                    {notice?.text || errorMessage(error)}
                </p>
            )}

            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[44rem] text-left">
                    <thead className="border-b border-line text-sm text-ink-muted">
                        <tr>
                            <th className="py-3 pl-6 pr-3 font-medium">Person</th>
                            <th className="px-3 font-medium">Role</th>
                            <th className="px-3 font-medium">Chats</th>
                            <th className="px-3 font-medium">Last sign in</th>
                            <th className="pl-3 pr-6"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {team?.map((m) => (
                            <MemberRow
                                key={m.id}
                                m={m}
                                isMe={m.id === session.userId}
                                onChanged={(text, ok) => { setNotice({ ok, text }); refresh(); }}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </Shell>
    );
}
