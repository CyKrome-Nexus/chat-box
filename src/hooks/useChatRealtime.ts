import { useCallback, useRef } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import { TConnectionStatus } from "@/src/lib/realtime/types";
import { composeMessage, editMessage as editMessageAction } from "@/src/redux/features/messagesSlice";
import { IMessage } from "@/src/interfaces/message-interface";
import { computeExpiresAt } from "@/src/lib/security/disappearingMessages";
import { encryptForConversation } from "@/src/lib/crypto/sessionManager";

const TYPING_TIMEOUT_MS = 3000;

/**
 * Per-screen helper for a single conversation: sends messages over the
 * shared realtime socket (queueing locally when offline), broadcasts a
 * debounced typing indicator, and exposes who else is currently typing plus
 * the overall connection status.
 */
export const useChatRealtime = (conversationId: string, currentUserId: string) => {
    const dispatch = useDispatch();
    const store = useStore();
    const isTypingRef = useRef(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connectionStatus = useSelector(
        (state: any) => state.connection.status as TConnectionStatus
    );
    const typingUsers: string[] = useSelector(
        (state: any) =>
            (state.connection.typingByConversation[conversationId] as string[] | undefined) || []
    );

    const stopTyping = useCallback(() => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (!isTypingRef.current) return;

        isTypingRef.current = false;
        realtimeSocketClient.emit("typing:update", {
            conversationId,
            userId: currentUserId,
            isTyping: false,
        });
    }, [conversationId, currentUserId]);

    const sendMessage = useCallback(
        (text: string, replyTo?: IMessage["replyTo"]): string | undefined => {
            const trimmed = text.trim();
            if (!trimmed) return undefined;

            const state: any = store.getState();
            const chat = state.chats.chats.find((c: any) => c.id === conversationId);

            const message: IMessage = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                conversationId,
                text: trimmed,
                type: "sender",
                timestamp: Date.now(),
                replyTo,
                expiresAt: computeExpiresAt(chat?.disappearingTimer),
            };

            // The local copy (what gets rendered/searched/edited) always
            // stays plaintext, same as every real E2EE messenger decrypts to
            // plaintext for local display — only the wire payload below is
            // ciphertext. See docs/architecture/e2ee-crypto.md.
            const emitted = realtimeSocketClient.getStatus() === "online";
            if (emitted) {
                encryptForConversation(conversationId, trimmed).then((envelope) => {
                    realtimeSocketClient.emit("message:send", {
                        conversationId,
                        messageId: message.id,
                        text: envelope,
                        senderId: currentUserId,
                        timestamp: message.timestamp,
                    });
                });
            }

            dispatch(
                composeMessage({
                    conversationId,
                    message: { ...message, status: emitted ? "sent" : undefined },
                    queued: !emitted,
                })
            );

            stopTyping();
            return message.id;
        },
        [conversationId, currentUserId, stopTyping, store]
    );

    const notifyTyping = useCallback(() => {
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            realtimeSocketClient.emit("typing:update", {
                conversationId,
                userId: currentUserId,
                isTyping: true,
            });
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(stopTyping, TYPING_TIMEOUT_MS);
    }, [conversationId, currentUserId, stopTyping]);

    /** Long-press "Edit" — optimistic local edit + best-effort broadcast (see message-actions.md). */
    const editMessage = useCallback(
        (messageId: string, text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            dispatch(editMessageAction({ conversationId, messageId, text: trimmed }));
            realtimeSocketClient.emit("message:edit", { conversationId, messageId, text: trimmed });
        },
        [conversationId, dispatch]
    );

    const markRead = useCallback(
        (messageId: string) => {
            realtimeSocketClient.emit("receipt:read", {
                conversationId,
                messageId,
                readerId: currentUserId,
            });
        },
        [conversationId, currentUserId]
    );

    return { connectionStatus, typingUsers, sendMessage, notifyTyping, markRead, editMessage };
};
