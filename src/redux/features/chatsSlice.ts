import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IChatRibbon } from "@/src/interfaces/list-interface";

interface ChatsState {
    chats: IChatRibbon[];
}

export const MAX_PINNED_CHATS = 5;

const initialState: ChatsState = {
    chats: [
        {
            id: "aarav-mehta",
            avatar: { url: "https://randomuser.me/api/portraits/men/12.jpg" },
            name: "Aarav Mehta",
            lastMessage: "Hey! Can you join the meeting?",
            lastStatus: "2 min ago",
            notificationCount: 3,
            status: "ONLINE",
        },
        {
            id: "priya-sharma",
            avatar: { url: "https://randomuser.me/api/portraits/women/18.jpg" },
            name: "Priya Sharma",
            lastMessage: "I'll send the report tonight.",
            lastStatus: "5 min ago",
            notificationCount: 0,
        },
        {
            id: "rohan-singh",
            avatar: { url: "https://randomuser.me/api/portraits/men/45.jpg" },
            name: "Rohan Singh",
            lastMessage: "Got it, thanks!",
            lastStatus: "15 min ago",
            notificationCount: 1,
            status: "ONLINE",
        },
        {
            id: "sara-khan",
            avatar: { url: "https://randomuser.me/api/portraits/women/33.jpg" },
            name: "Sara Khan",
            lastMessage: "Let's catch up later?",
            lastStatus: "1 hr ago",
            notificationCount: 0,
        },
        {
            id: "aditya-verma",
            avatar: { url: "https://randomuser.me/api/portraits/men/56.jpg" },
            name: "Aditya Verma",
            lastMessage: "Sending the files now...",
            lastStatus: "Yesterday",
            notificationCount: 2,
        },
    ],
};

export const chatsSlice = createSlice({
    name: "chats",
    initialState,
    reducers: {
        toggleMuteChat: (state, action: PayloadAction<string>) => {
            const chat = state.chats.find((c) => c.id === action.payload);
            if (chat) chat.muted = !chat.muted;
        },
        deleteChat: (state, action: PayloadAction<string>) => {
            state.chats = state.chats.filter((c) => c.id !== action.payload);
        },
        /**
         * Pinning is capped at MAX_PINNED_CHATS — the caller (UI) is expected
         * to warn the user before dispatching once the cap is already hit;
         * the reducer itself just refuses to pin a 6th to stay safe either way.
         */
        togglePinChat: (state, action: PayloadAction<string>) => {
            const chat = state.chats.find((c) => c.id === action.payload);
            if (!chat) return;
            if (!chat.pinned && state.chats.filter((c) => c.pinned).length >= MAX_PINNED_CHATS) return;
            chat.pinned = !chat.pinned;
        },
        toggleArchiveChat: (state, action: PayloadAction<string>) => {
            const chat = state.chats.find((c) => c.id === action.payload);
            if (chat) chat.archived = !chat.archived;
        },
        setChatDraft: (state, action: PayloadAction<{ chatId: string; draft: string }>) => {
            const chat = state.chats.find((c) => c.id === action.payload.chatId);
            if (chat) chat.draft = action.payload.draft || undefined;
        },
        markChatRead: (state, action: PayloadAction<string>) => {
            const chat = state.chats.find((c) => c.id === action.payload);
            if (chat) chat.notificationCount = 0;
        },
        /** Ticket's explicit "Mark as Unread" action — bumps to at least 1 so the unread badge/filter picks it up. */
        markChatUnread: (state, action: PayloadAction<string>) => {
            const chat = state.chats.find((c) => c.id === action.payload);
            if (chat) chat.notificationCount = Math.max(1, chat.notificationCount || 0);
        },
        /**
         * "Unarchive on new message" setting (see settings-chat.tsx): when
         * disabled, an incoming message for an archived chat stays archived
         * instead of popping back into the main inbox.
         */
        unarchiveChat: (state, action: PayloadAction<string>) => {
            const chat = state.chats.find((c) => c.id === action.payload);
            if (chat) chat.archived = false;
        },
        setDisappearingTimer: (
            state,
            action: PayloadAction<{ chatId: string; timer: IChatRibbon["disappearingTimer"] }>
        ) => {
            const chat = state.chats.find((c) => c.id === action.payload.chatId);
            if (chat) chat.disappearingTimer = action.payload.timer;
        },
        /** Replaces the list with what's in the local database on startup. */
        hydrateChats: (state, action: PayloadAction<IChatRibbon[]>) => {
            state.chats = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Cross-slice reaction: an incoming message bumps that chat's unread
        // badge, and un-archives it unless Settings > Chat has that disabled
        // (see setUnarchiveOnNewMessage). Matched by action type string
        // rather than importing messagesSlice's action creator, so this
        // slice doesn't need a hard dependency on that module.
        builder.addMatcher(
            (action): action is { type: string; payload: { conversationId: string } } =>
                action.type === "messages/receiveMessage",
            (state, action) => {
                const chat = state.chats.find((c) => c.id === action.payload.conversationId);
                if (!chat) return;
                chat.notificationCount = (chat.notificationCount || 0) + 1;
            }
        );
    },
});

export const {
    toggleMuteChat,
    deleteChat,
    togglePinChat,
    toggleArchiveChat,
    setChatDraft,
    markChatRead,
    markChatUnread,
    unarchiveChat,
    setDisappearingTimer,
    hydrateChats,
} = chatsSlice.actions;
export default chatsSlice.reducer;
