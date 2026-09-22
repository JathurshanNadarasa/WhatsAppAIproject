"use client";

import { useEffect, useRef, useState } from "react";

import {
    getConversation,
    getConversationMessages,
} from "../services/conversation.service";

import { sendWhatsAppMessage } from "../services/whatsapp.service";

import {
    Conversation,
    Message,
} from "../types/conversation";

interface ConversationDetailProps {
    conversationId: number;
}

export default function ConversationDetail({
    conversationId,
}: ConversationDetailProps) {

    const [conversation, setConversation] =
        useState<Conversation | null>(null);

    const [messages, setMessages] =
        useState<Message[]>([]);

    const [messageText, setMessageText] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [sending, setSending] =
        useState(false);

    const [error, setError] =
        useState("");

    const messagesEndRef =
        useRef<HTMLDivElement | null>(null);

    /*
     * Load conversation details
     */
    const loadConversation = async (
        showLoading = true
    ) => {

        try {

            if (showLoading) {
                setLoading(true);
            }

            setError("");

            const [
                conversationResponse,
                messagesResponse,
            ] = await Promise.all([
                getConversation(conversationId),
                getConversationMessages(conversationId),
            ]);

            setConversation(
                conversationResponse.conversation
            );

            setMessages(
                messagesResponse.messages
            );

        } catch (error) {

            console.error(
                "Failed to load conversation:",
                error
            );

            setError(
                "Failed to load conversation"
            );

        } finally {

            if (showLoading) {
                setLoading(false);
            }

        }
    };

    /*
     * Initial load
     */
    useEffect(() => {

        loadConversation();

    }, [conversationId]);

    /*
     * Auto refresh messages every 5 seconds
     */
    useEffect(() => {

        const interval = setInterval(() => {

            loadConversation(false);

        }, 5000);

        return () => {
            clearInterval(interval);
        };

    }, [conversationId]);

    /*
     * Auto scroll to latest message
     */
    useEffect(() => {

        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });

    }, [messages]);

    /*
     * Send message
     */
    const handleSendMessage = async () => {

        const trimmedMessage =
            messageText.trim();

        if (!trimmedMessage) {
            return;
        }

        if (!conversation) {
            return;
        }

        try {

            setSending(true);
            setError("");

            await sendWhatsAppMessage(
                conversation.customer_phone,
                trimmedMessage
            );

            setMessageText("");

            /*
             * Immediately reload messages
             */
            await loadConversation(false);

        } catch (error) {

            console.error(
                "Failed to send WhatsApp message:",
                error
            );

            setError(
                "Failed to send WhatsApp message"
            );

        } finally {

            setSending(false);

        }
    };

    /*
     * Enter key
     */
    const handleKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            handleSendMessage();

        }
    };

    if (loading) {

        return (
            <div className="flex h-full items-center justify-center p-6">
                <p className="text-gray-500">
                    Loading conversation...
                </p>
            </div>
        );

    }

    if (!conversation) {

        return (
            <div className="flex h-full items-center justify-center p-6">
                <p className="text-gray-500">
                    Conversation not found.
                </p>
            </div>
        );

    }

    return (

        <div className="flex h-full min-h-[600px] flex-col">

            {/* Header */}

            <div className="border-b bg-white p-4">

                <div className="flex items-center justify-between">

                    <div>

                        <h2 className="text-lg font-semibold">
                            {conversation.customer_name ||
                                "WhatsApp Customer"}
                        </h2>

                        <p className="text-sm text-gray-500">
                            {conversation.customer_phone}
                        </p>

                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        {conversation.status}
                    </span>

                </div>

            </div>

            {/* Messages */}

            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-5">

                {messages.length === 0 ? (

                    <div className="flex h-full items-center justify-center">

                        <p className="text-sm text-gray-500">
                            No messages yet.
                        </p>

                    </div>

                ) : (

                    messages.map((message) => {

                        const isBusiness =
                            message.sender_type ===
                            "business";

                        return (

                            <div
                                key={message.id}
                                className={`flex ${
                                    isBusiness
                                        ? "justify-end"
                                        : "justify-start"
                                }`}
                            >

                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                                        isBusiness
                                            ? "rounded-br-md bg-green-500 text-white"
                                            : "rounded-bl-md bg-white text-gray-900"
                                    }`}
                                >

                                    <p className="break-words text-sm">
                                        {message.message_text}
                                    </p>

                                    <p
                                        className={`mt-1 text-[10px] ${
                                            isBusiness
                                                ? "text-green-100"
                                                : "text-gray-400"
                                        }`}
                                    >
                                        {new Date(
                                            message.created_at
                                        ).toLocaleTimeString(
                                            [],
                                            {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            }
                                        )}
                                    </p>

                                </div>

                            </div>

                        );

                    })

                )}

                <div ref={messagesEndRef} />

            </div>

            {/* Error */}

            {error && (

                <div className="border-t bg-red-50 px-4 py-2">

                    <p className="text-sm text-red-600">
                        {error}
                    </p>

                </div>

            )}

            {/* Message Input */}

            <div className="border-t bg-white p-4">

                <div className="flex items-center gap-2">

                    <input
                        type="text"
                        value={messageText}
                        onChange={(event) =>
                            setMessageText(
                                event.target.value
                            )
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        disabled={sending}
                        className="flex-1 rounded-full border px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
                    />

                    <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={
                            sending ||
                            !messageText.trim()
                        }
                        className="rounded-full px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {sending
                            ? "Sending..."
                            : "Send"}
                    </button>

                </div>

                <p className="mt-2 text-xs text-gray-400">
                    Press Enter to send
                </p>

            </div>

        </div>
    );
}