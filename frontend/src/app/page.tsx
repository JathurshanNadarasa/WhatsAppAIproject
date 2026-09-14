"use client";

import { useEffect, useState } from "react";

import {
    getHealth,
    getVersion,
    getDatabaseHealth,
} from "../services/health.service";

import type {
    HealthResponse,
    VersionResponse,
    DatabaseHealthResponse,
} from "../types/api";

export default function Home() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [version, setVersion] = useState<VersionResponse | null>(null);
    const [database, setDatabase] =
        useState<DatabaseHealthResponse | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadSystemStatus = async () => {
            try {
                const [
                    healthResponse,
                    versionResponse,
                    databaseResponse,
                ] = await Promise.all([
                    getHealth(),
                    getVersion(),
                    getDatabaseHealth(),
                ]);

                setHealth(healthResponse);
                setVersion(versionResponse);
                setDatabase(databaseResponse);
            } catch (err) {
                console.error(err);
                setError("Unable to connect to the backend.");
            } finally {
                setLoading(false);
            }
        };

        loadSystemStatus();
    }, []);

    return (
        <main className="min-h-screen bg-gray-100 p-8">
            <div className="mx-auto max-w-6xl">

                <h1 className="text-3xl font-bold">
                    Nexora WhatsApp AI
                </h1>

                <p className="mt-2 text-gray-600">
                    WhatsApp Business Automation Platform
                </p>

                {loading && (
                    <p className="mt-8">
                        Checking system status...
                    </p>
                )}

                {error && (
                    <div className="mt-8 rounded-lg bg-red-100 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <div className="mt-8 grid gap-6 md:grid-cols-3">

                        <div className="rounded-xl bg-white p-6 shadow">
                            <p className="text-sm text-gray-500">
                                API Status
                            </p>

                            <h2 className="mt-2 text-xl font-semibold">
                                🟢 Online
                            </h2>

                            <p className="mt-2 text-sm text-gray-600">
                                {health?.message}
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-6 shadow">
                            <p className="text-sm text-gray-500">
                                Database
                            </p>

                            <h2 className="mt-2 text-xl font-semibold">
                                🟢 Connected
                            </h2>

                            <p className="mt-2 text-sm text-gray-600">
                                PostgreSQL
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-6 shadow">
                            <p className="text-sm text-gray-500">
                                API Version
                            </p>

                            <h2 className="mt-2 text-xl font-semibold">
                                {version?.version}
                            </h2>

                            <p className="mt-2 text-sm text-gray-600">
                                Backend version
                            </p>
                        </div>

                    </div>
                )}

            </div>
        </main>
    );
}