import { useEffect } from "react";
import { router } from "expo-router";
import { useDispatch, useStore } from "react-redux";
import notifee, { EventType, type Event } from "@notifee/react-native";

import { conversationsApi } from "@/src/lib/api/services";
import { sendMessage } from "@/src/lib/sync/chatSync";
import {
    ensureMessageNotificationSetup,
    MARK_READ_ACTION_ID,
    REPLY_ACTION_ID,
} from "@/src/lib/notifications/messageNotifications";
import type { RootState } from "@/src/redux/store/store";
import { markChatRead } from "@/src/redux/features/chatsSlice";

// Wires notification taps and the Reply / Mark-as-read quick actions back into the app.
export const useMessageNotifications = () => {
    const dispatch = useDispatch();
    const store = useStore<RootState>();

    useEffect(() => {
        void ensureMessageNotificationSetup();
    }, []);

    useEffect(() => {
        const handleEvent = async ({ type, detail }: Event) => {
            const conversationId = detail.notification?.data?.conversationId;
            if (typeof conversationId !== "string") return;

            if (type === EventType.PRESS) {
                const chat = store.getState().chats.chats.find((c) => c.id === conversationId);
                router.push("/(tabs)/messages");
                if (chat) router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(chat) } });
                return;
            }
            if (type !== EventType.ACTION_PRESS) return;

            if (detail.pressAction?.id === MARK_READ_ACTION_ID) {
                dispatch(markChatRead(conversationId));
                const last = store.getState().messages.byConversation[conversationId]?.filter((m) => !m.id.startsWith("local-")).at(-1);
                if (last) void conversationsApi.markRead(conversationId, last.id).catch(() => undefined);
            }

            if (detail.pressAction?.id === REPLY_ACTION_ID && detail.input?.trim()) {
                const text = detail.input.trim();
                await sendMessage({ conversationId, kind: "text", text }, { text });
            }

            if (detail.notification?.id) await notifee.cancelNotification(detail.notification.id);
        };

        const unsubscribeForeground = notifee.onForegroundEvent(handleEvent);
        notifee.onBackgroundEvent(handleEvent);
        return () => unsubscribeForeground();
    }, [dispatch, store]);
};
