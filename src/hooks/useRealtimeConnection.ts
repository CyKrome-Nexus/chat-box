import { useEffect, useRef } from "react";
import { useDispatch, useStore } from "react-redux";

import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import {
    IMessageEditEvent,
    IMessageReceiveEvent,
    IPresenceEvent,
    IReadReceiptEvent,
    ITypingEvent,
} from "@/src/lib/realtime/types";
import { setConnectionStatus, setPresence, setTyping } from "@/src/redux/features/connectionSlice";
import {
    editMessage,
    markMessageFlushed,
    receiveMessage,
    updateMessageStatus,
} from "@/src/redux/features/messagesSlice";
import { unarchiveChat } from "@/src/redux/features/chatsSlice";

/**
 * The realtime server URL. Configure via an EXPO_PUBLIC_ env var so it can
 * differ per environment without a code change. When unset, the app runs in
 * fully offline mode: messages compose locally and queue for a future flush
 * instead of the client trying (and failing) to reach a server that doesn't
 * exist yet.
 */
const REALTIME_URL = process.env.EXPO_PUBLIC_REALTIME_URL;

/**
 * Owns the single realtime socket connection for the whole app: connects
 * once, mirrors connection status into Redux, registers the server->client
 * event listeners, and flushes any queued outgoing messages as soon as the
 * connection (re)establishes. Mount this once near the app root.
 */
export const useRealtimeConnection = (currentUserId?: string) => {
    const dispatch = useDispatch();
    const store = useStore();
    const hasFlushedRef = useRef(false);

    useEffect(() => {
        if (!REALTIME_URL) {
            dispatch(setConnectionStatus("offline"));
            return;
        }

        const unsubscribeStatus = realtimeSocketClient.onStatusChange((status) => {
            dispatch(setConnectionStatus(status));

            if (status === "online" && !hasFlushedRef.current) {
                hasFlushedRef.current = true;
                flushOutbox();
            }
            if (status !== "online") {
                hasFlushedRef.current = false;
            }
        });

        const flushOutbox = () => {
            const state: any = store.getState();
            const outbox = state.messages.outboxByConversation as Record<string, string[]>;

            Object.entries(outbox).forEach(([conversationId, messageIds]) => {
                messageIds.forEach((messageId) => {
                    const message = state.messages.byConversation[conversationId]?.find(
                        (m: any) => m.id === messageId
                    );
                    if (!message) return;

                    const emitted = realtimeSocketClient.emit("message:send", {
                        conversationId,
                        messageId,
                        text: message.text,
                        senderId: currentUserId || "me",
                        timestamp: message.timestamp,
                    });

                    if (emitted) {
                        dispatch(markMessageFlushed({ conversationId, messageId }));
                    }
                });
            });
        };

        const onMessageReceive = (payload: IMessageReceiveEvent) => {
            dispatch(
                receiveMessage({
                    conversationId: payload.conversationId,
                    message: {
                        id: payload.messageId,
                        conversationId: payload.conversationId,
                        text: payload.text,
                        type: "receiver",
                        timestamp: payload.timestamp,
                    },
                })
            );

            const state: any = store.getState();
            const chat = state.chats.chats.find((c: any) => c.id === payload.conversationId);
            if (chat?.archived && state.settings.chat.unarchiveOnNewMessage) {
                dispatch(unarchiveChat(payload.conversationId));
            }
        };

        const onTypingUpdate = (payload: ITypingEvent) => {
            dispatch(setTyping(payload));
        };

        const onReadReceipt = (payload: IReadReceiptEvent) => {
            dispatch(
                updateMessageStatus({
                    conversationId: payload.conversationId,
                    messageId: payload.messageId,
                    status: "read",
                })
            );
        };

        const onPresenceUpdate = (payload: IPresenceEvent) => {
            dispatch(setPresence(payload));
        };

        const onMessageEdit = (payload: IMessageEditEvent) => {
            dispatch(editMessage(payload));
        };

        realtimeSocketClient.connect(REALTIME_URL, currentUserId ? { userId: currentUserId } : undefined);
        realtimeSocketClient.on("message:receive", onMessageReceive);
        realtimeSocketClient.on("message:edit", onMessageEdit);
        realtimeSocketClient.on("typing:update", onTypingUpdate);
        realtimeSocketClient.on("receipt:read", onReadReceipt);
        realtimeSocketClient.on("presence:update", onPresenceUpdate);

        return () => {
            unsubscribeStatus();
            realtimeSocketClient.off("message:receive", onMessageReceive);
            realtimeSocketClient.off("message:edit", onMessageEdit);
            realtimeSocketClient.off("typing:update", onTypingUpdate);
            realtimeSocketClient.off("receipt:read", onReadReceipt);
            realtimeSocketClient.off("presence:update", onPresenceUpdate);
            realtimeSocketClient.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserId]);
};
