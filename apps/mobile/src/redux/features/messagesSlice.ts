import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IMessage, TMessageStatus } from "@/src/interfaces/message-interface";

interface MessagesState {
    byConversation: Record<string, IMessage[]>;
    /** Message ids waiting to be flushed to the server once back online. */
    outboxByConversation: Record<string, string[]>;
}

const initialState: MessagesState = {
    byConversation: {},
    outboxByConversation: {},
};

const findMessage = (state: MessagesState, conversationId: string, messageId: string) =>
    state.byConversation[conversationId]?.find((m) => m.id === messageId);

const sameMessage = (a: IMessage, b: IMessage) => a.id === b.id || (!!a.clientId && a.clientId === b.clientId);

// Server copies replace optimistic ones (matched by clientId) while keeping local-only state.
const mergeInto = (existing: IMessage[], incoming: IMessage[]): IMessage[] => {
    const next = [...existing];
    for (const message of incoming) {
        const index = next.findIndex((item) => sameMessage(item, message));
        if (index === -1) next.push(message);
        else {
            const previous = next[index];
            // Keep the local file for media we just sent so it doesn't re-download from the server.
            const localUri = previous.attachment?.uri?.startsWith("file:") ? previous.attachment.uri : undefined;
            const attachment = message.attachment
                ? { ...message.attachment, uri: localUri ?? message.attachment.uri, uploadProgress: undefined }
                : previous.attachment;
            next[index] = { ...message, starred: previous.starred, attachment };
        }
    }
    return next.sort((a, b) => a.timestamp - b.timestamp);
};

export const messagesSlice = createSlice({
    name: "messages",
    initialState,
    reducers: {
        upsertMessages: (state, action: PayloadAction<{ conversationId: string; messages: IMessage[] }>) => {
            const { conversationId, messages } = action.payload;
            state.byConversation[conversationId] = mergeInto(state.byConversation[conversationId] || [], messages);
            const ids = new Set(messages.flatMap((m) => [m.id, m.clientId].filter(Boolean) as string[]));
            state.outboxByConversation[conversationId] = (state.outboxByConversation[conversationId] || []).filter(
                (id) => !ids.has(id)
            );
        },
        patchMessage: (state, action: PayloadAction<{ conversationId: string; messageId: string; patch: Partial<IMessage> }>) => {
            const message = findMessage(state, action.payload.conversationId, action.payload.messageId);
            if (message) Object.assign(message, action.payload.patch);
        },
        markMessageFailed: (state, action: PayloadAction<{ conversationId: string; messageId: string }>) => {
            const message = findMessage(state, action.payload.conversationId, action.payload.messageId);
            if (message) message.status = "failed";
        },
        removeConversationMessages: (state, action: PayloadAction<string>) => {
            delete state.byConversation[action.payload];
            delete state.outboxByConversation[action.payload];
        },
        /**
         * Optimistically appends an already-built outgoing message (the
         * caller is responsible for id/timestamp so it can use the same id
         * when emitting over the socket). `queued: true` also tracks the
         * message id in the outbox so it can be flushed on reconnect.
         */
        composeMessage: (
            state,
            action: PayloadAction<{ conversationId: string; message: IMessage; queued: boolean }>
        ) => {
            const { conversationId, message, queued } = action.payload;

            if (!state.byConversation[conversationId]) {
                state.byConversation[conversationId] = [];
            }
            state.byConversation[conversationId].push(message);

            if (queued) {
                if (!state.outboxByConversation[conversationId]) {
                    state.outboxByConversation[conversationId] = [];
                }
                state.outboxByConversation[conversationId].push(message.id);
            }
        },
        /** Marks a previously-queued message as sent and removes it from the outbox. */
        markMessageFlushed: (
            state,
            action: PayloadAction<{ conversationId: string; messageId: string }>
        ) => {
            const { conversationId, messageId } = action.payload;
            const message = findMessage(state, conversationId, messageId);
            if (message) message.status = "sent";

            state.outboxByConversation[conversationId] = (
                state.outboxByConversation[conversationId] || []
            ).filter((id) => id !== messageId);
        },
        updateMessageStatus: (
            state,
            action: PayloadAction<{ conversationId: string; messageId: string; status: TMessageStatus }>
        ) => {
            const { conversationId, messageId, status } = action.payload;
            const message = findMessage(state, conversationId, messageId);
            if (!message) return;

            message.status = status;
            if (status === "delivered" || status === "read") {
                if (!message.deliveredAt) message.deliveredAt = Date.now();
            }
            if (status === "read" && !message.readAt) {
                message.readAt = Date.now();
            }
        },
        /** Appends an incoming message pushed by the realtime server. */
        receiveMessage: (
            state,
            action: PayloadAction<{ conversationId: string; message: IMessage }>
        ) => {
            const { conversationId, message } = action.payload;
            if (!state.byConversation[conversationId]) {
                state.byConversation[conversationId] = [];
            }
            state.byConversation[conversationId].push(message);
        },
        /** Drives the local simulated upload progress bar for an attachment message. */
        updateAttachmentProgress: (
            state,
            action: PayloadAction<{ conversationId: string; messageId: string; progress: number }>
        ) => {
            const { conversationId, messageId, progress } = action.payload;
            const message = findMessage(state, conversationId, messageId);
            if (message?.attachment) {
                message.attachment.uploadProgress = progress;
                if (progress >= 100) message.status = "sent";
            }
        },
        /** Marks a "view once" attachment as opened, so it renders as consumed afterward. */
        markAttachmentViewed: (
            state,
            action: PayloadAction<{ conversationId: string; messageId: string }>
        ) => {
            const { conversationId, messageId } = action.payload;
            const message = findMessage(state, conversationId, messageId);
            if (message?.attachment) message.attachment.viewOnceOpened = true;
        },
        /** Lightbox "Delete" action, or any other single-message delete. */
        deleteMessage: (
            state,
            action: PayloadAction<{ conversationId: string; messageId: string }>
        ) => {
            const { conversationId, messageId } = action.payload;
            state.byConversation[conversationId] = (state.byConversation[conversationId] || []).filter(
                (m) => m.id !== messageId
            );
        },
        /** Long-press "Edit" — allowed only within the editing window (enforced by the caller). */
        editMessage: (
            state,
            action: PayloadAction<{ conversationId: string; messageId: string; text: string }>
        ) => {
            const { conversationId, messageId, text } = action.payload;
            const message = findMessage(state, conversationId, messageId);
            if (!message) return;
            message.text = text;
            message.edited = true;
            message.editedAt = Date.now();
        },
        /** Long-press "Star / Bookmark" — toggles membership in the Starred Messages list. */
        toggleStarMessage: (
            state,
            action: PayloadAction<{ conversationId: string; messageId: string }>
        ) => {
            const message = findMessage(state, action.payload.conversationId, action.payload.messageId);
            if (message) message.starred = !message.starred;
        },
        /** Quick-reaction pill — tapping the same emoji again clears it. */
        setMessageReaction: (
            state,
            action: PayloadAction<{ conversationId: string; messageId: string; emoji: string }>
        ) => {
            const { conversationId, messageId, emoji } = action.payload;
            const message = findMessage(state, conversationId, messageId);
            if (!message) return;
            message.reaction = message.reaction === emoji ? undefined : emoji;
        },
        /**
         * "Delete for Everyone": leaves a tombstone in place (unlike
         * `deleteMessage`, "Delete for Me", which removes the row outright).
         */
        deleteForEveryone: (
            state,
            action: PayloadAction<{ conversationId: string; messageId: string }>
        ) => {
            const message = findMessage(state, action.payload.conversationId, action.payload.messageId);
            if (!message) return;
            message.text = "";
            message.attachment = undefined;
            message.reaction = undefined;
            message.deletedForEveryone = true;
        },
        /** Settings > Chat > "Clear all chats". */
        clearAllMessages: (state) => {
            state.byConversation = {};
            state.outboxByConversation = {};
        },
        /** Replaces all conversations' messages with what's in the local database on startup. */
        hydrateMessages: (state, action: PayloadAction<Record<string, IMessage[]>>) => {
            state.byConversation = action.payload;
        },
    },
});

export const {
    upsertMessages,
    patchMessage,
    markMessageFailed,
    removeConversationMessages,
    composeMessage,
    markMessageFlushed,
    updateMessageStatus,
    receiveMessage,
    updateAttachmentProgress,
    markAttachmentViewed,
    deleteMessage,
    editMessage,
    toggleStarMessage,
    setMessageReaction,
    deleteForEveryone,
    clearAllMessages,
    hydrateMessages,
} = messagesSlice.actions;
export default messagesSlice.reducer;
