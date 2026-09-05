import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import { TConnectionStatus } from "@/src/lib/realtime/types";
import { composeMessage } from "@/src/redux/features/messagesSlice";
import { IMessage } from "@/src/interfaces/message-interface";

const TYPING_TIMEOUT_MS = 3000;

/**
 * Per-screen helper for a single conversation: sends messages over the
 * shared realtime socket (queueing locally when offline), broadcasts a
 * debounced typing indicator, and exposes who else is currently typing plus
 * the overall connection status.
 */
export const useChatRealtime = (conversationId: string, currentUserId: string) => {
    const dispatch = useDispatch();
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
        (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            const message: IMessage = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                conversationId,
                text: trimmed,
                type: "sender",
                timestamp: Date.now(),
            };

            const emitted = realtimeSocketClient.emit("message:send", {
                conversationId,
                messageId: message.id,
                text: trimmed,
                senderId: currentUserId,
                timestamp: message.timestamp,
            });

            dispatch(
                composeMessage({
                    conversationId,
                    message: { ...message, status: emitted ? "sent" : undefined },
                    queued: !emitted,
                })
            );

            stopTyping();
        },
        [conversationId, currentUserId, stopTyping]
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

    return { connectionStatus, typingUsers, sendMessage, notifyTyping, markRead };
};
