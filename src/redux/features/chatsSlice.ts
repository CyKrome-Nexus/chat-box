import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IChatRibbon } from "@/src/interfaces/list-interface";

interface ChatsState {
    chats: IChatRibbon[];
}

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
        /** Replaces the list with what's in the local database on startup. */
        hydrateChats: (state, action: PayloadAction<IChatRibbon[]>) => {
            state.chats = action.payload;
        },
    },
});

export const { toggleMuteChat, deleteChat, hydrateChats } = chatsSlice.actions;
export default chatsSlice.reducer;
