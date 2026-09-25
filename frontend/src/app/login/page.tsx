"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorMessage, login, TOKEN_KEY } from "../../lib/api";
import { saveSession } from "../../lib/session";
import type { Role } from "../../lib/types";

export default function LoginPage() {

    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const result = await login(email.trim(), password);
            window.localStorage.setItem(TOKEN_KEY, result.token);
            saveSession({ name: result.user?.name || "", role: result.user?.role as Role, userId: result.user?.id });
            router.replace("/");
        } catch (err) {
            setError(errorMessage(err, "Email or password is incorrect."));
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center px-5">
            <div className="w-full max-w-sm">
                <p className="text-3xl font-semibold">Nexora</p>
                <p className="mt-1 text-ink-soft">Sign in to see who is waiting for you on WhatsApp.</p>

                <form onSubmit={submit} className="mt-8 space-y-4">
                    <label className="block">
                        <span className="text-sm font-medium">Email</span>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5"
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">Password</span>
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5"
                        />
                    </label>

                    {error && <p role="alert" className="rounded-lg bg-hot-soft px-3 py-2 text-sm text-hot">{error}</p>}

                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full rounded-lg bg-ink px-4 py-2.5 font-medium text-white hover:bg-ink-soft disabled:opacity-60"
                    >
                        {busy ? "Signing in…" : "Sign in"}
                    </button>
                </form>
            </div>
        </main>
    );
}
