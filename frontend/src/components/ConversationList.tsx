"use client";

import { useEffect, useState } from "react";

import {
    getConversations,
} from "../services/conversation.service";

import {
    Conversation,
} from "../types/conversation";

export default function ConversationList() {

    const [conversations, setConversations] =
        useState<Conversation[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {

        const loadConversations = async () => {

            try {

                const response =
                    await getConversations();

                setConversations(
                    response.conversations
                );

            } catch (error) {

                console.error(error);

                setError(
                    "Failed to load conversations"
                );

            } finally {

                setLoading(false);

            }
        };

        loadConversations();

    }, []);

    if (loading) {
        return (
            <div className="p-6">
                Loading conversations...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-500">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">

            <div>

                <h2 className="text-2xl font-bold">
                    Conversations
                </h2>

                <p className="text-gray-500">
                    WhatsApp customer conversations
                </p>

            </div>

            <div className="space-y-3">

                {conversations.map(
                    (conversation) => (

                        <div
                            key={conversation.id}
                            className="rounded-lg border bg-white p-5 shadow-sm"
                        >

                            <div className="flex items-center justify-between">

                                <h3 className="font-semibold">
                                    {conversation.customer_name ||
                                        "Unknown Customer"}
                                </h3>

                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                                    {conversation.status}
                                </span>

                            </div>

                            <p className="mt-1 text-sm text-gray-500">
                                {conversation.customer_phone}
                            </p>

                            <p className="mt-2 text-xs text-gray-400">
                                Last message:{" "}
                                {new Date(
                                    conversation.last_message_at
                                ).toLocaleString()}
                            </p>

                        </div>

                    )
                )}

            </div>

        </div>
    );
}