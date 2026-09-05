export type TMessageType = "sender" | "receiver";

export type TMessageStatus = "sent" | "delivered" | "read";

export type TAttachmentType = "image" | "video" | "document" | "location" | "audio" | "video_note";

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
}

export interface IMessage {
    id: string;
    conversationId: string;
    text: string;
    type: TMessageType;
    timestamp: number;
    status?: TMessageStatus;
    attachment?: IAttachment;
    /**
     * A lightweight quote of the message this one is replying to (swipe-to-
     * reply — see docs/architecture/micro-animations.md). Full reply
     * threading/jump-to-message is out of scope here.
     */
    replyTo?: {
        text: string;
        isSender: boolean;
    };
}
