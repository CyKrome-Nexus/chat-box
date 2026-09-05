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

export const messagesSlice = createSlice({
    name: "messages",
    initialState,
    reducers: {
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
            if (message) message.status = status;
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
        seedConversation: (
            state,
            action: PayloadAction<{ conversationId: string; messages: IMessage[] }>
        ) => {
            const { conversationId, messages } = action.payload;
            if (!state.byConversation[conversationId]) {
                state.byConversation[conversationId] = messages;
            }
        },
    },
});

export const {
    composeMessage,
    markMessageFlushed,
    updateMessageStatus,
    receiveMessage,
    seedConversation,
} = messagesSlice.actions;
export default messagesSlice.reducer;
