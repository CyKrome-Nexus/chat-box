import { useEffect } from "react";
import { router } from "expo-router";
import { useDispatch, useStore } from "react-redux";
import notifee, { EventType } from "@notifee/react-native";

import {
    ensureMessageNotificationSetup,
    MARK_READ_ACTION_ID,
    REPLY_ACTION_ID,
} from "@/src/lib/notifications/messageNotifications";
import { composeMessage } from "@/src/redux/features/messagesSlice";
import { markChatRead } from "@/src/redux/features/chatsSlice";
import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import { IChatRibbon } from "@/src/interfaces/list-interface";
import { encryptForConversation } from "@/src/lib/crypto/sessionManager";

/**
 * Registers the message notification channel/category once, and wires the
 * "Reply"/"Mark as Read" quick actions (and a plain tap) back into app
 * state/navigation. See docs/architecture/push-notifications.md.
 *
 * `onBackgroundEvent` is registered here (inside a mounted hook) rather than
 * at the true module top-level the way Notifee's own docs recommend — this
 * repo's entry point is the stock `expo-router/entry` with no custom
 * index.js to hook earlier, so this only covers "app backgrounded but the JS
 * engine is still alive," not a fully killed/terminated app. Waking a killed
 * app to handle a background action needs a real silent push (see the
 * "Background Sync" section of the docs) which this environment has no
 * server to send.
 */
export const useMessageNotifications = () => {
    const dispatch = useDispatch();
    const store = useStore();

    useEffect(() => {
        ensureMessageNotificationSetup();
    }, []);

    useEffect(() => {
        const handleEvent = async ({ type, detail }: { type: EventType; detail: any }) => {
            const conversationId: string | undefined = detail.notification?.data?.conversationId;
            if (!conversationId) return;

            if (type === EventType.PRESS) {
                router.push("/(tabs)/messages");
                const state: any = store.getState();
                const chat = (state.chats.chats as IChatRibbon[]).find((c) => c.id === conversationId);
                if (chat) {
                    router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(chat) } });
                }
                return;
            }

            if (type !== EventType.ACTION_PRESS) return;

            if (detail.pressAction?.id === MARK_READ_ACTION_ID) {
                dispatch(markChatRead(conversationId));
                await notifee.cancelNotification(detail.notification.id);
                return;
            }

            if (detail.pressAction?.id === REPLY_ACTION_ID && detail.input) {
                const text = detail.input.trim();
                if (text) {
                    const message = {
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        conversationId,
                        text,
                        type: "sender" as const,
                        timestamp: Date.now(),
                    };
                    dispatch(composeMessage({ conversationId, message, queued: false }));
                    // The reply is E2EE-encrypted the same way a normal
                    // send is (see e2ee-crypto.md) — only the wire payload
                    // is ciphertext, not this locally-composed plaintext
                    // copy. This is the JS-reachable half of the ticket's
                    // "reply from the notification encrypts and sends
                    // cleanly" requirement; see encrypted-push.md for why a
                    // *true* NSE/foreground-service-level reply-encrypt
                    // (before the JS engine even loads) isn't achievable in
                    // this environment.
                    encryptForConversation(conversationId, text).then((envelope) => {
                        realtimeSocketClient.emit("message:send", {
                            conversationId,
                            messageId: message.id,
                            text: envelope,
                            senderId: "me",
                            timestamp: message.timestamp,
                        });
                    });
                }
                await notifee.cancelNotification(detail.notification.id);
            }
        };

        const unsubscribeForeground = notifee.onForegroundEvent(handleEvent);
        notifee.onBackgroundEvent(handleEvent);

        return () => unsubscribeForeground();
    }, [dispatch, store]);
};
