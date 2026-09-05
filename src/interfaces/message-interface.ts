export type TMessageType = "sender" | "receiver";

export type TMessageStatus = "sent" | "delivered" | "read";

export type TAttachmentType = "image" | "video" | "document" | "location";

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
}

export interface IMessage {
    id: string;
    conversationId: string;
    text: string;
    type: TMessageType;
    timestamp: number;
    status?: TMessageStatus;
    attachment?: IAttachment;
}
