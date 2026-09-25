"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import { usePoll } from "../../lib/usePoll";

export default function NotificationBell() {

    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);

    const { data, refresh } = usePoll(getNotifications, 20000);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
        };
        const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", esc);
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("keydown", esc);
        };
    }, []);

    const unread = data?.unread ?? 0;

    const openItem = async (id: number) => {
        await markNotificationRead(id).catch(() => undefined);
        setOpen(false);
        refresh();
    };

    const hrefFor = (n: { conversation_id: number | null; lead_id: number | null }) =>
        n.conversation_id ? `/inbox?c=${n.conversation_id}` : n.lead_id ? `/leads?lead=${n.lead_id}` : "/";

    return (
        <div ref={box} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={unread ? `${unread} unread notifications` : "Notifications"}
                className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-line/60"
            >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" strokeLinejoin="round" />
                    <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
                </svg>
                {unread > 0 && (
                    <span className="absolute right-1 top-1 min-w-5 rounded-full bg-hot px-1 text-center text-[11px] font-semibold leading-5 text-white">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                        <p className="font-semibold">Notifications</p>
                        {unread > 0 && (
                            <button
                                type="button"
                                className="text-sm text-staff hover:underline"
                                onClick={async () => { await markAllNotificationsRead(); refresh(); }}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <ul className="max-h-[26rem] overflow-y-auto">
                        {(data?.notifications ?? []).length === 0 && (
                            <li className="px-4 py-6 text-sm text-ink-muted">
                                Nothing yet. Hot leads, registrations and handover requests will show up here.
                            </li>
                        )}
                        {data?.notifications.map((n) => (
                            <li key={n.id} className="border-b border-line last:border-0">
                                <Link
                                    href={hrefFor(n)}
                                    onClick={() => openItem(n.id)}
                                    className={`block px-4 py-3 hover:bg-paper ${n.is_read ? "text-ink-soft" : ""}`}
                                >
                                    <span className="flex items-start gap-2">
                                        {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-staff" aria-label="Unread" />}
                                        <span className="min-w-0">
                                            <span className={`block ${n.is_read ? "" : "font-semibold"}`}>{n.title}</span>
                                            {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">{n.body}</span>}
                                            <span className="mt-1 block text-xs text-ink-muted">{timeAgo(n.created_at)}</span>
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
