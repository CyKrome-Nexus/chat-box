export type TMessageType = "sender" | "receiver";

import type { MessageKind, Poll, Reaction, SharedContact } from "@chatbox/shared";

export type TMessageStatus = "pending" | "failed" | "sent" | "delivered" | "read";

export type TAttachmentType = "image" | "video" | "document" | "location" | "audio" | "video_note" | "sticker";

export interface IAttachment {
    type: TAttachmentType;
    uri?: string;
    name?: string;
    size?: number;
    mimeType?: string;
    latitude?: number;
    longitude?: number;
    /** 0-100. Undefined/100 means the "upload" has finished. */
    uploadProgress?: number;
    /** Audio/video_note attachments only: duration in seconds. */
    duration?: number;
    /** Audio attachments only: a normalized (0-1) amplitude sample set. */
    waveform?: number[];
    /** Image/video attachments only: ephemeral "view once" media (see media-editor.md). */
    viewOnce?: boolean;
    /** Image/video attachments only: set once the recipient has opened a view-once attachment. */
    viewOnceOpened?: boolean;
    /** "sticker" attachments only — id into state.stickers.stickers. See stickers.md. */
    stickerId?: string;
}

export interface IMessage {
    id: string;
    /** Client-generated idempotency key; reconciles optimistic sends with the server copy. */
    clientId?: string;
    conversationId: string;
    kind?: MessageKind;
    text: string;
    type: TMessageType;
    timestamp: number;
    status?: TMessageStatus;
    attachment?: IAttachment;
    /** Set once `status` has reached "delivered" (or later) — see message-actions.md. */
    deliveredAt?: number;
    /** Set once `status` has reached "read". */
    readAt?: number;
    /** True once the sender has edited this message's text (see message-actions.md). */
    edited?: boolean;
    editedAt?: number;
    /** Starred/bookmarked via the message actions menu. */
    starred?: boolean;
    /** The current user's reaction. */
    reaction?: string;
    reactions?: Reaction[];
    poll?: Poll;
    contact?: SharedContact;
    /**
     * "Delete for Everyone": the message stays in the list as a tombstone
     * (text/attachment cleared) rather than being removed, unlike
     * `deleteMessage` ("Delete for Me").
     */
    deletedForEveryone?: boolean;
    /** Disappearing Messages — set when composed/received in a conversation with an active timer. See security-privacy.md. */
    expiresAt?: number;
    /** Group chats only — identifies which participant sent a "receiver"-type message. See groups.md. */
    senderId?: string;
    senderName?: string;
    senderColor?: string;
    /**
     * A quote of the message this one is replying to (swipe-to-reply, or the
     * long-press "Reply" action — see docs/architecture/micro-animations.md
     * and message-actions.md). `messageId` lets tapping the quote scroll
     * back to the original.
     */
    replyTo?: {
        messageId: string;
        text: string;
        isSender: boolean;
    };
}
