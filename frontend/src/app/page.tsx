"use client";

import { useState } from "react";

import Sidebar from "../components/Sidebar";
import CustomerList from "../components/CustomerList";
import ConversationList from "../components/ConversationList";

export default function Home() {

    const [activePage, setActivePage] =
        useState("dashboard");

    return (
        <div className="flex min-h-screen bg-gray-50">

            <Sidebar
                activePage={activePage}
                setActivePage={setActivePage}
            />

            <main className="flex-1 p-8">

                {activePage === "dashboard" && (

                    <div>

                        <h1 className="text-3xl font-bold">
                            Dashboard
                        </h1>

                        <p className="mt-2 text-gray-500">
                            Welcome to Nexora WhatsApp AI.
                        </p>

                        <div className="mt-8 grid gap-5 md:grid-cols-3">

                            <div className="rounded-xl border bg-white p-6 shadow-sm">
                                <p className="text-sm text-gray-500">
                                    Customers
                                </p>

                                <p className="mt-2 text-3xl font-bold">
                                    CRM
                                </p>
                            </div>

                            <div className="rounded-xl border bg-white p-6 shadow-sm">
                                <p className="text-sm text-gray-500">
                                    Conversations
                                </p>

                                <p className="mt-2 text-3xl font-bold">
                                    WhatsApp
                                </p>
                            </div>

                            <div className="rounded-xl border bg-white p-6 shadow-sm">
                                <p className="text-sm text-gray-500">
                                    AI
                                </p>

                                <p className="mt-2 text-3xl font-bold">
                                    Coming Soon
                                </p>
                            </div>

                        </div>

                    </div>
                )}

                {activePage === "customers" && (
                    <CustomerList />
                )}

                {activePage === "conversations" && (
                    <ConversationList />
                )}

            </main>

        </div>
    );
}