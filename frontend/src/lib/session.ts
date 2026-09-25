"use client";

import { useEffect, useState } from "react";

import { ROLE_KEY, USER_ID_KEY, USER_KEY } from "./api";
import type { Role } from "./types";

// Who is signed in (saved at login, refreshed by Shell from /auth/me)
export interface Session {
    name: string;
    role: Role;
    userId: number | null;
}

export const readSession = (): Session => {
    if (typeof window === "undefined") return { name: "", role: "staff", userId: null };
    return {
        name: window.localStorage.getItem(USER_KEY) || "",
        role: (window.localStorage.getItem(ROLE_KEY) as Role) || "staff",
        userId: Number(window.localStorage.getItem(USER_ID_KEY)) || null,
    };
};

export const saveSession = (s: { name: string; role: Role; userId: number }) => {
    window.localStorage.setItem(USER_KEY, s.name);
    window.localStorage.setItem(ROLE_KEY, s.role);
    window.localStorage.setItem(USER_ID_KEY, String(s.userId));
    window.dispatchEvent(new Event("nexora-session"));
};

export const clearSession = () => {
    [USER_KEY, ROLE_KEY, USER_ID_KEY].forEach((k) => window.localStorage.removeItem(k));
};

// React hook: re-renders when Shell refreshes the session
export function useSession(): Session {
    const [session, setSession] = useState<Session>({ name: "", role: "staff", userId: null });
    useEffect(() => {
        const update = () => setSession(readSession());
        update();
        window.addEventListener("nexora-session", update);
        return () => window.removeEventListener("nexora-session", update);
    }, []);
    return session;
}
