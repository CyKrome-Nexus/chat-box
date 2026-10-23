import { useEffect } from "react";
import { AppState } from "react-native";
import { useDispatch, useStore } from "react-redux";

import { previewText, type Message, type PresencePayload, type ReceiptPayload, type ServerToClientEvents, type TypingPayload } from "@chatbox/shared";

import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import { callEngineManager } from "@/src/lib/calling/callEngineManager";
import {
    applyConversation,
    applyMessages,
    flushOutbox,
    forgetConversation,
    refreshTicks,
    syncCallHistory,
    syncConversations,
} from "@/src/lib/sync/chatSync";
import { syncContacts } from "@/src/lib/sync/contactsSync";
import { syncStories } from "@/src/lib/sync/storiesSync";
import { logoutUser } from "@/src/lib/features";
import { showMessageNotification } from "@/src/lib/notifications/messageNotifications";
import { playSoundEffect } from "@/src/lib/audio/soundEffects";
import { MESSAGE_TONES, previewTone } from "@/src/lib/audio/notificationTones";
import type { RootState } from "@/src/redux/store/store";
import { setConnectionStatus, setPresence, setTyping, showInAppBanner } from "@/src/redux/features/connectionSlice";
import { deleteMessage, patchMessage } from "@/src/redux/features/messagesSlice";
import { patchChat, unarchiveChat } from "@/src/redux/features/chatsSlice";
import { addStory } from "@/src/redux/features/storiesSlice";
import { toLocalStory } from "@/src/lib/sync/storiesSync";

const TYPING_TTL_MS = 6000;

// Owns the app-wide socket: connects for the signed-in user and mirrors server events into Redux.
export const useRealtimeConnection = (currentUserId?: string) => {
    const dispatch = useDispatch();
    const store = useStore<RootState>();

    useEffect(() => {
        if (!currentUserId) return;
        const socket = realtimeSocketClient.connect();
        if (!socket) return;

        const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

        const unsubscribeStatus = realtimeSocketClient.onStatusChange((status) => {
            dispatch(setConnectionStatus(status));
            if (status !== "online") return;
            void (async () => {
                await syncConversations().catch(() => undefined);
                await flushOutbox().catch(() => undefined);
                const peers = store
                    .getState()
                    .chats.chats.flatMap((chat) => (chat.peerId ? [chat.peerId] : []))
                    .slice(0, 500);
                const presence = await socket.timeout(5000).emitWithAck("presence:subscribe", { userIds: peers }).catch(() => null);
                if (presence?.ok) presence.data.forEach((item: PresencePayload) => dispatch(setPresence({ userId: item.userId, status: item.online ? "online" : "offline" })));
                void syncCallHistory().catch(() => undefined);
                void syncContacts().catch(() => undefined);
                void syncStories().catch(() => undefined);
            })();
        });

        const notify = (message: Message) => {
            const state = store.getState();
            const chat = state.chats.chats.find((c) => c.id === message.conversationId);
            const text = previewText({ kind: message.kind, text: message.text, deleted: false });

            if (chat?.archived && state.settings.chat.unarchiveOnNewMessage) dispatch(unarchiveChat(message.conversationId));
            if (chat?.muted || state.connection.activeConversationId === message.conversationId) return;

            if (state.settings.notifications.inAppSounds) {
                const customTone = state.settings.customNotifications[message.conversationId]?.messageTone;
                if (customTone && customTone !== "default") previewTone(customTone, MESSAGE_TONES);
                else playSoundEffect("messageReceived");
            }

            const title = chat?.name ?? message.sender?.name ?? "New message";
            const body = chat?.isGroup ? `${message.sender?.name ?? ""}: ${text}` : text;
            if (AppState.currentState === "active") {
                dispatch(showInAppBanner({ conversationId: message.conversationId, chatName: title, avatarUrl: chat?.avatar?.url, text: body }));
            } else {
                void showMessageNotification({ conversationId: message.conversationId, chatName: title, chatAvatarUrl: chat?.avatar?.url, messageText: body });
            }
        };

        const onMessage: ServerToClientEvents["message:new"] = (message) => {
            const state = store.getState();
            const mine = message.sender?.id === currentUserId;
            const viewing = state.connection.activeConversationId === message.conversationId && AppState.currentState === "active";
            const chat = state.chats.chats.find((c) => c.id === message.conversationId);

            applyMessages(message.conversationId, [message]);
            if (!chat) {
                void syncConversations().catch(() => undefined);
            } else {
                const prefix = chat.isGroup && message.kind !== "system" && message.sender ? `${mine ? "You" : message.sender.name.split(" ")[0]}: ` : "";
                dispatch(
                    patchChat({
                        chatId: message.conversationId,
                        patch: {
                            lastMessage: `${prefix}${previewText({ kind: message.kind, text: message.text, deleted: false })}`,
                            lastMessageAt: Date.parse(message.createdAt),
                            notificationCount: mine || viewing || message.kind === "system" ? chat.notificationCount : (chat.notificationCount ?? 0) + 1,
                        },
                    }),
                );
            }

            if (mine || message.kind === "system") return;
            const typingKey = `${message.conversationId}:${message.sender?.id}`;
            clearTimeout(typingTimers.get(typingKey));
            dispatch(setTyping({ conversationId: message.conversationId, userId: message.sender?.id ?? "", isTyping: false }));
            realtimeSocketClient.emit("message:delivered", { conversationId: message.conversationId, messageId: message.id });
            notify(message);
        };

        const onUpdated: ServerToClientEvents["message:updated"] = (message) => applyMessages(message.conversationId, [message]);

        const onDeleted: ServerToClientEvents["message:deleted"] = ({ conversationId, messageId }) =>
            dispatch(deleteMessage({ conversationId, messageId }));

        const onReactions: ServerToClientEvents["message:reactions"] = ({ conversationId, messageId, reactions }) =>
            dispatch(
                patchMessage({
                    conversationId,
                    messageId,
                    patch: { reactions, reaction: reactions.find((reaction) => reaction.userIds.includes(currentUserId))?.emoji },
                }),
            );

        const onPoll: ServerToClientEvents["poll:updated"] = ({ conversationId, messageId, poll }) =>
            dispatch(patchMessage({ conversationId, messageId, patch: { poll } }));

        const onReceipt = (payload: ReceiptPayload) => {
            const chat = store.getState().chats.chats.find((c) => c.id === payload.conversationId);
            if (!chat) return;
            const at = Date.parse(payload.at);
            const memberReads = (chat.memberReads ?? []).map((member) =>
                member.userId !== payload.userId
                    ? member
                    : payload.status === "read"
                      ? { ...member, readAt: Math.max(member.readAt ?? 0, at) }
                      : { ...member, deliveredAt: Math.max(member.deliveredAt ?? 0, at) },
            );
            dispatch(patchChat({ chatId: payload.conversationId, patch: { memberReads } }));
            refreshTicks(payload.conversationId);
        };

        const onTyping = (payload: TypingPayload) => {
            const key = `${payload.conversationId}:${payload.userId}`;
            clearTimeout(typingTimers.get(key));
            dispatch(setTyping(payload));
            if (payload.isTyping) {
                typingTimers.set(key, setTimeout(() => dispatch(setTyping({ ...payload, isTyping: false })), TYPING_TTL_MS));
            }
        };

        const onPresence = (payload: PresencePayload) =>
            dispatch(setPresence({ userId: payload.userId, status: payload.online ? "online" : "offline", lastSeenAt: payload.lastSeenAt }));

        const onConversation: ServerToClientEvents["conversation:upsert"] = (conversation) => applyConversation(conversation);
        const onRemoved: ServerToClientEvents["conversation:removed"] = ({ conversationId }) => forgetConversation(conversationId);
        const onStory: ServerToClientEvents["story:new"] = (story) => dispatch(addStory(toLocalStory(story, currentUserId)));
        const onRevoked = () => void logoutUser(dispatch);

        realtimeSocketClient.on("message:new", onMessage);
        realtimeSocketClient.on("message:updated", onUpdated);
        realtimeSocketClient.on("message:deleted", onDeleted);
        realtimeSocketClient.on("message:reactions", onReactions);
        realtimeSocketClient.on("poll:updated", onPoll);
        realtimeSocketClient.on("receipt:update", onReceipt);
        realtimeSocketClient.on("typing:update", onTyping);
        realtimeSocketClient.on("presence:update", onPresence);
        realtimeSocketClient.on("conversation:upsert", onConversation);
        realtimeSocketClient.on("conversation:removed", onRemoved);
        realtimeSocketClient.on("story:new", onStory);
        realtimeSocketClient.on("session:revoked", onRevoked);
        callEngineManager.attach(currentUserId);

        const appStateSubscription = AppState.addEventListener("change", (state) => {
            if (state === "active" && realtimeSocketClient.getStatus() === "online") void syncConversations().catch(() => undefined);
        });

        return () => {
            appStateSubscription.remove();
            unsubscribeStatus();
            typingTimers.forEach((timer) => clearTimeout(timer));
            callEngineManager.detach();
            realtimeSocketClient.disconnect();
        };
    }, [currentUserId, dispatch, store]);
};
