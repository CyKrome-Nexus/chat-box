import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IMessage } from "@/src/interfaces/message-interface";

interface MessagesState {
    byConversation: Record<string, IMessage[]>;
}

const initialState: MessagesState = {
    byConversation: {},
};

export const messagesSlice = createSlice({
    name: "messages",
    initialState,
    reducers: {
        sendMessage: (
            state,
            action: PayloadAction<{ conversationId: string; text: string }>
        ) => {
            const { conversationId, text } = action.payload;
            const trimmed = text.trim();
            if (!trimmed) return;

            const message: IMessage = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                conversationId,
                text: trimmed,
                type: "sender",
                timestamp: Date.now(),
                status: "sent",
            };

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

export const { sendMessage, seedConversation } = messagesSlice.actions;
export default messagesSlice.reducer;
