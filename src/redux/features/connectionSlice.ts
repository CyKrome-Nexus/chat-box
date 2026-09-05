import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TConnectionStatus } from "@/src/lib/realtime/types";

interface ConnectionState {
    status: TConnectionStatus;
    typingByConversation: Record<string, string[]>;
    presenceByUser: Record<string, "online" | "offline">;
}

const initialState: ConnectionState = {
    status: "idle",
    typingByConversation: {},
    presenceByUser: {},
};

export const connectionSlice = createSlice({
    name: "connection",
    initialState,
    reducers: {
        setConnectionStatus: (state, action: PayloadAction<TConnectionStatus>) => {
            state.status = action.payload;
        },
        setTyping: (
            state,
            action: PayloadAction<{ conversationId: string; userId: string; isTyping: boolean }>
        ) => {
            const { conversationId, userId, isTyping } = action.payload;
            const current = state.typingByConversation[conversationId] || [];

            state.typingByConversation[conversationId] = isTyping
                ? Array.from(new Set([...current, userId]))
                : current.filter((id) => id !== userId);
        },
        setPresence: (
            state,
            action: PayloadAction<{ userId: string; status: "online" | "offline" }>
        ) => {
            state.presenceByUser[action.payload.userId] = action.payload.status;
        },
    },
});

export const { setConnectionStatus, setTyping, setPresence } = connectionSlice.actions;
export default connectionSlice.reducer;
