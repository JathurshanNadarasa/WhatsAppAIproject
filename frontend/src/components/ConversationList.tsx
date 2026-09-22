"use client";

import { useEffect, useState } from "react";

import {
    getConversations,
} from "../services/conversation.service";

import {
    Conversation,
} from "../types/conversation";

import ConversationDetail from "./ConversationDetail";

export default function ConversationList() {

    const [conversations, setConversations] =
        useState<Conversation[]>([]);

    const [selectedConversationId, setSelectedConversationId] =
        useState<number | null>(null);

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

            {/* Page Header */}

            <div>

                <h2 className="text-2xl font-bold">
                    Conversations
                </h2>

                <p className="text-gray-500">
                    WhatsApp customer conversations
                </p>

            </div>

            {/* Main Content */}

            <div className="grid min-h-[600px] grid-cols-1 overflow-hidden rounded-xl border bg-white shadow-sm lg:grid-cols-3">

                {/* Conversation List */}

                <div className="border-r">

                    <div className="border-b p-4">

                        <h3 className="font-semibold">
                            Conversations
                        </h3>

                        <p className="text-sm text-gray-500">
                            {conversations.length} conversations
                        </p>

                    </div>

                    <div className="divide-y">

                        {conversations.length === 0 ? (

                            <div className="p-5 text-sm text-gray-500">
                                No conversations found.
                            </div>

                        ) : (

                            conversations.map(
                                (conversation) => (

                                    <button
                                        key={conversation.id}
                                        type="button"
                                        onClick={() =>
                                            setSelectedConversationId(
                                                conversation.id
                                            )
                                        }
                                        className={`w-full p-5 text-left transition ${
                                            selectedConversationId ===
                                            conversation.id
                                                ? "bg-gray-100"
                                                : "hover:bg-gray-50"
                                        }`}
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
                                            {
                                                conversation.customer_phone
                                            }
                                        </p>

                                        <p className="mt-2 text-xs text-gray-400">
                                            Last message:{" "}
                                            {new Date(
                                                conversation.last_message_at
                                            ).toLocaleString()}
                                        </p>

                                    </button>

                                )
                            )

                        )}

                    </div>

                </div>

                {/* Conversation Detail */}

                <div className="lg:col-span-2">

                    {selectedConversationId !== null ? (

                        <ConversationDetail
                            conversationId={
                                selectedConversationId
                            }
                        />

                    ) : (

                        <div className="flex min-h-[600px] items-center justify-center p-6">

                            <div className="text-center">

                                <div className="text-4xl">
                                    💬
                                </div>

                                <h3 className="mt-3 text-lg font-semibold">
                                    Select a conversation
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                    Select a customer conversation
                                    to view messages and reply.
                                </p>

                            </div>

                        </div>

                    )}

                </div>

            </div>

        </div>
    );
}