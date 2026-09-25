"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getMe, TOKEN_KEY } from "../../lib/api";
import { clearSession, saveSession, useSession } from "../../lib/session";
import NotificationBell from "./NotificationBell";

const NAV = [
    { href: "/", label: "Overview" },
    { href: "/inbox", label: "Inbox" },
    { href: "/leads", label: "Leads" },
    { href: "/automations", label: "Automations" },
    { href: "/knowledge", label: "Courses & FAQs" },
    { href: "/team", label: "Team", adminOnly: true },
];

export default function Shell({
    title,
    actions,
    children,
    fullHeight = false,
}: {
    title: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    fullHeight?: boolean;
}) {

    const pathname = usePathname();
    const router = useRouter();

    const [ready, setReady] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const session = useSession();

    // No token -> login. Then refresh name/role from the server
    // (an admin may have changed this person's role).
    useEffect(() => {
        if (!window.localStorage.getItem(TOKEN_KEY)) {
            router.replace("/login");
            return;
        }
        setReady(true);
        getMe()
            .then((me) => saveSession({ name: me.name, role: me.role, userId: me.userId }))
            .catch(() => undefined);   // 401 is handled by the API client
    }, [router]);

    const signOut = () => {
        window.localStorage.removeItem(TOKEN_KEY);
        clearSession();
        router.replace("/login");
    };

    const userName = session.name;
    const nav = NAV.filter((item) => !item.adminOnly || session.role === "admin");

    if (!ready) return null;

    const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

    return (
        <div className="flex min-h-screen">

            <aside
                className={`${menuOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-60 flex-col bg-ink text-white lg:static lg:flex`}
            >
                <div className="px-6 pb-8 pt-7">
                    <p className="text-xl font-semibold">Nexora</p>
                    <p className="text-sm text-white/60">WhatsApp console</p>
                </div>

                <nav className="flex-1 px-3" aria-label="Main">
                    {nav.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            aria-current={isActive(item.href) ? "page" : undefined}
                            className={`mb-1 block rounded-lg px-3 py-2.5 ${
                                isActive(item.href) ? "bg-white/12 font-medium text-white" : "text-white/70 hover:bg-white/6 hover:text-white"
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="border-t border-white/10 px-6 py-5 text-sm">
                    {userName && <p className="truncate text-white/80">{userName}</p>}
                    <p className="text-xs capitalize text-white/50">{session.role}</p>
                    <button type="button" onClick={signOut} className="mt-1 text-white/60 hover:text-white">
                        Sign out
                    </button>
                </div>
            </aside>

            {menuOpen && (
                <button
                    type="button"
                    aria-label="Close menu"
                    className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            <div className={`flex min-w-0 flex-1 flex-col ${fullHeight ? "h-screen" : ""}`}>
                <header className="flex items-center gap-3 border-b border-line bg-paper px-5 py-3 lg:px-8">
                    <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-sm font-medium lg:hidden"
                        onClick={() => setMenuOpen(true)}
                    >
                        Menu
                    </button>
                    <h1 className="flex-1 text-2xl font-semibold">{title}</h1>
                    {actions}
                    <NotificationBell />
                </header>

                <main className={`min-w-0 flex-1 ${fullHeight ? "overflow-hidden" : "px-5 py-6 lg:px-8"}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}
