import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IChatRibbon, IGroupParticipant, TGroupRole } from "@/src/interfaces/list-interface";

interface ChatsState {
    chats: IChatRibbon[];
}

export const MAX_PINNED_CHATS = 5;
export const MAX_GROUP_PARTICIPANTS = 1024;

/** Assigns a stable, visually distinct color per participant for group bubble usernames. */
export const PARTICIPANT_COLORS = [
    "#E74C3C", "#8E44AD", "#2E86C1", "#1ABC9C", "#F39C12", "#D35400", "#27AE60", "#2980B9",
];
export const colorForParticipant = (index: number) => PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];

const initialState: ChatsState = {
    chats: [],
};

const sortByActivity = (chats: IChatRibbon[]) =>
    [...chats].sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));

export const chatsSlice = createSlice({
    name: "chats",
    initialState,
    reducers: {
        upsertChats: (state, action: PayloadAction<IChatRibbon[]>) => {
            // Broadcast lists are device-local and never come back from the server.
            state.chats = sortByActivity([...action.payload, ...state.chats.filter((c) => c.isBroadcast)]);
        },
        upsertChat: (state, action: PayloadAction<IChatRibbon>) => {
            state.chats = sortByActivity([action.payload, ...state.chats.filter((c) => c.id !== action.payload.id)]);
        },
        patchChat: (state, action: PayloadAction<{ chatId: string; patch: Partial<IChatRibbon> }>) => {
            const chat = state.chats.find((c) => c.id === action.payload.chatId);
            if (chat) Object.assign(chat, action.payload.patch);
            if (action.payload.patch.lastMessageAt !== undefined) state.chats = sortByActivity(state.chats);
        },
        removeChat: (state, action: PayloadAction<string>) => {
            state.chats = state.chats.filter((c) => c.id !== action.payload);
        },
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
        /** Group creation — see docs/architecture/groups.md. */
        updateGroupInfo: (
            state,
            action: PayloadAction<{ chatId: string; name?: string; description?: string; avatarUrl?: string }>
        ) => {
            const chat = state.chats.find((c) => c.id === action.payload.chatId);
            if (!chat) return;
            if (action.payload.name) chat.name = action.payload.name;
            if (action.payload.description !== undefined) chat.groupDescription = action.payload.description;
            if (action.payload.avatarUrl) chat.avatar = { url: action.payload.avatarUrl };
        },
        addGroupParticipants: (
            state,
            action: PayloadAction<{ chatId: string; participants: IGroupParticipant[] }>
        ) => {
            const chat = state.chats.find((c) => c.id === action.payload.chatId);
            if (!chat?.participants) return;
            const existingIds = new Set(chat.participants.map((p) => p.id));
            const toAdd = action.payload.participants.filter((p) => !existingIds.has(p.id));
            chat.participants = chat.participants.concat(toAdd).slice(0, MAX_GROUP_PARTICIPANTS);
        },
        removeGroupParticipant: (state, action: PayloadAction<{ chatId: string; participantId: string }>) => {
            const chat = state.chats.find((c) => c.id === action.payload.chatId);
            if (!chat?.participants) return;
            chat.participants = chat.participants.filter((p) => p.id !== action.payload.participantId);
        },
        setParticipantRole: (
            state,
            action: PayloadAction<{ chatId: string; participantId: string; role: TGroupRole }>
        ) => {
            const chat = state.chats.find((c) => c.id === action.payload.chatId);
            const participant = chat?.participants?.find((p) => p.id === action.payload.participantId);
            if (participant) participant.role = action.payload.role;
        },
        setGroupSetting: (
            state,
            action: PayloadAction<{
                chatId: string;
                key: keyof NonNullable<IChatRibbon["groupSettings"]>;
                value: boolean | "all" | "admins";
            }>
        ) => {
            const chat = state.chats.find((c) => c.id === action.payload.chatId);
            if (chat?.groupSettings) (chat.groupSettings as any)[action.payload.key] = action.payload.value;
        },
        /** Deep-link join via /join/[code] — adds "me" as a member. See groups.md. */
        /** Broadcast List — a fan-out send target, not a real group. See groups.md. */
        createBroadcastList: (
            state,
            action: PayloadAction<{ id: string; name: string; recipientIds: string[] }>
        ) => {
            state.chats.push({
                id: action.payload.id,
                name: action.payload.name,
                avatar: { url: "" },
                isBroadcast: true,
                broadcastRecipientIds: action.payload.recipientIds,
                lastStatus: "Just now",
                notificationCount: 0,
            });
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
    upsertChats,
    upsertChat,
    patchChat,
    removeChat,
    toggleMuteChat,
    deleteChat,
    togglePinChat,
    toggleArchiveChat,
    setChatDraft,
    markChatRead,
    markChatUnread,
    unarchiveChat,
    setDisappearingTimer,
    updateGroupInfo,
    addGroupParticipants,
    removeGroupParticipant,
    setParticipantRole,
    setGroupSetting,
    createBroadcastList,
    hydrateChats,
} = chatsSlice.actions;
export default chatsSlice.reducer;
