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

const generateInviteCode = () => Math.random().toString(36).slice(2, 10).toUpperCase();

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
        /** Group creation — see docs/architecture/groups.md. */
        createGroup: (
            state,
            action: PayloadAction<{
                id: string;
                name: string;
                avatar: { url: string };
                description?: string;
                participants: IGroupParticipant[];
            }>
        ) => {
            const { id, name, avatar, description, participants } = action.payload;
            state.chats.push({
                id,
                name,
                avatar,
                isGroup: true,
                groupDescription: description,
                participants: participants.slice(0, MAX_GROUP_PARTICIPANTS),
                groupSettings: {
                    whoCanSendMessages: "all",
                    whoCanEditInfo: "all",
                    requireAdminApproval: false,
                },
                inviteCode: generateInviteCode(),
                lastStatus: "Just now",
                notificationCount: 0,
            });
        },
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
        regenerateInviteCode: (state, action: PayloadAction<string>) => {
            const chat = state.chats.find((c) => c.id === action.payload);
            if (chat) chat.inviteCode = generateInviteCode();
        },
        /** Deep-link join via /join/[code] — adds "me" as a member. See groups.md. */
        joinGroupByInviteCode: (state, action: PayloadAction<{ inviteCode: string; me: IGroupParticipant }>) => {
            const chat = state.chats.find((c) => c.inviteCode === action.payload.inviteCode);
            if (!chat?.participants) return;
            if (!chat.participants.some((p) => p.id === action.payload.me.id)) {
                chat.participants.push(action.payload.me);
            }
        },
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
    toggleMuteChat,
    deleteChat,
    togglePinChat,
    toggleArchiveChat,
    setChatDraft,
    markChatRead,
    markChatUnread,
    unarchiveChat,
    setDisappearingTimer,
    createGroup,
    updateGroupInfo,
    addGroupParticipants,
    removeGroupParticipant,
    setParticipantRole,
    setGroupSetting,
    regenerateInviteCode,
    joinGroupByInviteCode,
    createBroadcastList,
    hydrateChats,
} = chatsSlice.actions;
export default chatsSlice.reducer;
