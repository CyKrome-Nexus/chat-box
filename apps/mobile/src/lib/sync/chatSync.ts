import type { Conversation, Message, SendMessageInput } from "@chatbox/shared";

import { callsApi, conversationsApi, messagesApi } from "@/src/lib/api/services";
import { statusFromReads, toChatRibbon, toLocalMessage } from "@/src/lib/api/mappers";
import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import type { IMessage } from "@/src/interfaces/message-interface";
import { store } from "@/src/redux/store/store";
import { removeChat, upsertChat, upsertChats } from "@/src/redux/features/chatsSlice";
import { composeMessage, markMessageFailed, removeConversationMessages, upsertMessages } from "@/src/redux/features/messagesSlice";
import { hydrateCallHistory } from "@/src/redux/features/callSlice";

const conversations = new Map<string, Conversation>();

const myId = () => store.getState().user?.id ?? "";
const chatById = (id: string) => store.getState().chats.chats.find((chat) => chat.id === id);

export const getConversation = (id: string) => conversations.get(id) ?? null;

export const newClientId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

export const applyConversation = (conversation: Conversation) => {
    conversations.set(conversation.id, conversation);
    store.dispatch(upsertChat(toChatRibbon(conversation, myId(), chatById(conversation.id))));
    refreshTicks(conversation.id);
};

export const forgetConversation = (conversationId: string) => {
    conversations.delete(conversationId);
    store.dispatch(removeChat(conversationId));
    store.dispatch(removeConversationMessages(conversationId));
};

export const syncConversations = async () => {
    const list = await conversationsApi.list();
    const me = myId();
    conversations.clear();
    list.forEach((conversation) => conversations.set(conversation.id, conversation));
    store.dispatch(upsertChats(list.map((conversation) => toChatRibbon(conversation, me, chatById(conversation.id)))));
};

const toLocal = (message: Message) =>
    toLocalMessage(message, myId(), conversations.get(message.conversationId), chatById(message.conversationId));

export const applyMessages = (conversationId: string, messages: Message[]) => {
    if (messages.length === 0) return;
    store.dispatch(upsertMessages({ conversationId, messages: messages.map(toLocal) }));
};

export const loadMessages = async (conversationId: string, before?: string) => {
    const page = await conversationsApi.messages(conversationId, { before });
    applyMessages(conversationId, page.items);
    return page.nextCursor;
};

// Recomputes ticks on outgoing messages after read/delivery pointers move.
export const refreshTicks = (conversationId: string) => {
    const chat = chatById(conversationId);
    const messages = store.getState().messages.byConversation[conversationId] ?? [];
    const updated = messages.flatMap((message) => {
        if (message.type !== "sender" || message.status === "pending" || message.status === "failed") return [];
        const status = statusFromReads(message.timestamp, chat);
        return status === message.status ? [] : [{ ...message, status }];
    });
    if (updated.length) store.dispatch(upsertMessages({ conversationId, messages: updated }));
};

export const syncCallHistory = async () => {
    store.dispatch(hydrateCallHistory(await callsApi.history()));
};

type TOutgoing = Omit<SendMessageInput, "clientId"> & { clientId?: string };

// Optimistic send: the local copy shows immediately and is reconciled by clientId on ack.
export const sendMessage = async (input: TOutgoing, optimistic?: Partial<IMessage>): Promise<Message | null> => {
    const clientId = input.clientId ?? newClientId();
    const payload = { ...input, clientId } as SendMessageInput;
    const localId = `local-${clientId}`;

    if (optimistic) {
        store.dispatch(
            composeMessage({
                conversationId: input.conversationId,
                message: {
                    id: localId,
                    clientId,
                    conversationId: input.conversationId,
                    kind: input.kind,
                    text: input.text ?? "",
                    type: "sender",
                    timestamp: Date.now(),
                    status: "pending",
                    senderId: myId(),
                    ...optimistic,
                },
                queued: realtimeSocketClient.getStatus() !== "online",
            }),
        );
    }

    try {
        const socket = realtimeSocketClient.raw;
        const message =
            socket && realtimeSocketClient.getStatus() === "online"
                ? await socket
                      .timeout(15_000)
                      .emitWithAck("message:send", payload)
                      .then((response) => {
                          if (!response.ok) throw new Error(response.error.message);
                          return response.data;
                      })
                : await messagesApi.send(payload);
        applyMessages(message.conversationId, [message]);
        return message;
    } catch {
        store.dispatch(markMessageFailed({ conversationId: input.conversationId, messageId: localId }));
        return null;
    }
};

// Re-sends anything still pending/failed, e.g. after reconnecting.
export const flushOutbox = async () => {
    const { byConversation } = store.getState().messages;
    for (const [conversationId, messages] of Object.entries(byConversation)) {
        for (const message of messages) {
            if (message.type !== "sender" || (message.status !== "pending" && message.status !== "failed") || !message.clientId) continue;
            if (message.attachment?.uri?.startsWith("file:")) continue;
            await sendMessage({ conversationId, clientId: message.clientId, kind: message.kind === "text" || !message.kind ? "text" : message.kind, text: message.text } as TOutgoing);
        }
    }
};
