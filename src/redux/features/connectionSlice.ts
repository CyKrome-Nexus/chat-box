import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TConnectionStatus } from "@/src/lib/realtime/types";

export interface IInAppBanner {
    conversationId: string;
    chatName: string;
    avatarUrl?: string;
    text: string;
}

interface ConnectionState {
    status: TConnectionStatus;
    typingByConversation: Record<string, string[]>;
    presenceByUser: Record<string, "online" | "offline">;
    /** Conversation currently open on screen — see push-notifications.md for why this matters. */
    activeConversationId: string | null;
    /** In-app notification banner — see InAppMessageBanner.tsx. */
    pendingBanner: IInAppBanner | null;
}

const initialState: ConnectionState = {
    status: "idle",
    typingByConversation: {},
    presenceByUser: {},
    activeConversationId: null,
    pendingBanner: null,
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
        setActiveConversationId: (state, action: PayloadAction<string | null>) => {
            state.activeConversationId = action.payload;
        },
        showInAppBanner: (state, action: PayloadAction<IInAppBanner>) => {
            state.pendingBanner = action.payload;
        },
        dismissInAppBanner: (state) => {
            state.pendingBanner = null;
        },
    },
});

export const {
    setConnectionStatus,
    setTyping,
    setPresence,
    setActiveConversationId,
    showInAppBanner,
    dismissInAppBanner,
} = connectionSlice.actions;
export default connectionSlice.reducer;
