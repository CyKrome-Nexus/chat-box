import {
    conversationAvatar,
    conversationTitle,
    deliveryStatus,
    directPeer,
    previewText,
    type Attachment,
    type Conversation,
    type CurrentUser,
    type Message,
} from "@chatbox/shared";

import type { IAttachment, IMessage, TAttachmentType } from "@/src/interfaces/message-interface";
import type { IChatRibbon, IGroupParticipant, TGroupRole } from "@/src/interfaces/list-interface";
import type { IUser } from "@/src/interfaces/user-interface";
import { colorForParticipant } from "@/src/redux/features/chatsSlice";

type TTimer = NonNullable<IChatRibbon["disappearingTimer"]>;

const TIMER_SECONDS: Record<Exclude<TTimer, "off">, number> = {
    "24h": 24 * 60 * 60,
    "7d": 7 * 24 * 60 * 60,
    "90d": 90 * 24 * 60 * 60,
};

export const timerToSeconds = (timer: TTimer): number | null => (timer === "off" ? null : TIMER_SECONDS[timer]);

const secondsToTimer = (seconds: number | null): TTimer => {
    if (!seconds) return "off";
    const match = (Object.entries(TIMER_SECONDS) as [Exclude<TTimer, "off">, number][]).find(([, value]) => value === seconds);
    return match?.[0] ?? "24h";
};

export const toLocalUser = (user: CurrentUser): IUser => ({
    id: user.id,
    name: user.name,
    username: user.email ?? user.phone ?? user.handle ?? user.id,
    handle: user.handle ?? undefined,
    avatar: user.avatarUrl ? { url: user.avatarUrl } : undefined,
    about: user.about ?? undefined,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    role: user.role,
    privacy: user.privacy,
    hasPassword: user.hasPassword,
});

const toTimestamp = (value: string | null | undefined) => (value ? Date.parse(value) : undefined);

const toParticipant = (member: Conversation["members"][number], index: number, myId: string): IGroupParticipant => ({
    id: member.user.id === myId ? "me" : member.user.id,
    name: member.user.id === myId ? "You" : member.user.name,
    avatar: member.user.avatarUrl ? { url: member.user.avatarUrl } : undefined,
    role: member.role as TGroupRole,
    color: colorForParticipant(index),
});

// Local-only flags (pin, archive, draft) are preserved from the previous ribbon.
export const toChatRibbon = (conversation: Conversation, myId: string, previous?: IChatRibbon): IChatRibbon => {
    const peer = directPeer(conversation, myId);
    const isGroup = conversation.type === "group";
    const last = conversation.lastMessage;
    const senderPrefix =
        isGroup && last && last.kind !== "system" && last.senderName
            ? `${last.senderId === myId ? "You" : last.senderName.split(" ")[0]}: `
            : "";
    const myRole = conversation.members.find((member) => member.user.id === myId)?.role;
    const mutedUntil = toTimestamp(conversation.mutedUntil);

    return {
        id: conversation.id,
        name: conversationTitle(conversation, myId),
        avatar: { url: conversationAvatar(conversation, myId) ?? "" },
        lastMessage: last ? `${senderPrefix}${previewText(last)}` : undefined,
        lastMessageAt: toTimestamp(last?.createdAt ?? conversation.createdAt),
        notificationCount: conversation.unreadCount,
        muted: mutedUntil !== undefined && mutedUntil > Date.now(),
        pinned: previous?.pinned,
        archived: previous?.archived,
        draft: previous?.draft,
        isGroup,
        groupDescription: conversation.description ?? undefined,
        groupTags: conversation.tags,
        participants: isGroup ? conversation.members.map((member, index) => toParticipant(member, index, myId)) : undefined,
        groupSettings: isGroup
            ? {
                  whoCanSendMessages: conversation.settings.onlyAdminsCanSend ? "admins" : "all",
                  whoCanEditInfo: conversation.settings.onlyAdminsCanEditInfo ? "admins" : "all",
                  requireAdminApproval: conversation.settings.onlyAdminsCanAddMembers,
              }
            : undefined,
        inviteCode: conversation.inviteCode ?? undefined,
        disappearingTimer: secondsToTimer(conversation.disappearingSeconds),
        peerId: peer?.id,
        peerHandle: peer?.handle ?? undefined,
        myRole: myRole as TGroupRole | undefined,
        memberReads: conversation.members
            .filter((member) => member.user.id !== myId)
            .map((member) => ({
                userId: member.user.id,
                readAt: toTimestamp(member.lastReadAt),
                deliveredAt: toTimestamp(member.lastDeliveredAt),
            })),
    };
};

const ATTACHMENT_TYPES: Record<Attachment["kind"], TAttachmentType> = {
    image: "image",
    video: "video",
    audio: "audio",
    document: "document",
    sticker: "sticker",
    video_note: "video_note",
};

const toLocalAttachment = (message: Message): IAttachment | undefined => {
    const [first] = message.attachments;
    if (first) {
        return {
            type: ATTACHMENT_TYPES[first.kind],
            uri: first.url,
            name: first.name ?? undefined,
            size: first.size,
            mimeType: first.mimeType,
            duration: first.durationSeconds ?? undefined,
            waveform: first.waveform ?? undefined,
            viewOnce: first.viewOnce || undefined,
        };
    }
    if (message.sticker) return { type: "sticker", stickerId: message.sticker.id, name: message.sticker.emoji ?? undefined };
    if (message.location) {
        return { type: "location", latitude: message.location.latitude, longitude: message.location.longitude, name: message.location.label ?? undefined };
    }
    return undefined;
};

// Read pointers per member decide ticks; equivalent to shared deliveryStatus but from ribbon data.
export const statusFromReads = (timestamp: number, chat: IChatRibbon | undefined): IMessage["status"] => {
    const reads = chat?.memberReads ?? [];
    if (reads.length === 0) return "sent";
    if (reads.every((member) => (member.readAt ?? 0) >= timestamp)) return "read";
    if (reads.every((member) => Math.max(member.deliveredAt ?? 0, member.readAt ?? 0) >= timestamp)) return "delivered";
    return "sent";
};

export const toLocalMessage = (
    message: Message,
    myId: string,
    conversation?: Conversation | null,
    chat?: IChatRibbon,
): IMessage => {
    const mine = message.sender?.id === myId;
    const timestamp = Date.parse(message.createdAt);
    const participantIndex = chat?.participants?.findIndex((participant) => participant.id === message.sender?.id) ?? -1;
    const status = mine ? (conversation ? deliveryStatus(message, conversation, myId) : statusFromReads(timestamp, chat)) : undefined;

    return {
        id: message.id,
        clientId: message.clientId ?? undefined,
        conversationId: message.conversationId,
        kind: message.kind,
        text: message.text ?? "",
        type: mine ? "sender" : "receiver",
        timestamp,
        status: status === "pending" ? "sent" : status,
        attachment: toLocalAttachment(message),
        edited: Boolean(message.editedAt) || undefined,
        editedAt: toTimestamp(message.editedAt),
        reaction: message.reactions.find((reaction) => reaction.userIds.includes(myId))?.emoji,
        reactions: message.reactions,
        poll: message.poll ?? undefined,
        contact: message.contact ?? undefined,
        deletedForEveryone: Boolean(message.deletedAt) || undefined,
        expiresAt: toTimestamp(message.expiresAt),
        senderId: message.sender?.id,
        senderName: message.sender?.name,
        senderColor: participantIndex >= 0 ? colorForParticipant(participantIndex) : undefined,
        replyTo: message.replyTo
            ? {
                  messageId: message.replyTo.id,
                  text: message.replyTo.text ?? previewText({ kind: message.replyTo.kind, text: null, deleted: false }),
                  isSender: message.replyTo.senderId === myId,
              }
            : undefined,
    };
};
