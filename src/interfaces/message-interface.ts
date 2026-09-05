export type TMessageType = "sender" | "receiver";

export type TMessageStatus = "sent" | "delivered" | "read";

export interface IMessage {
    id: string;
    conversationId: string;
    text: string;
    type: TMessageType;
    timestamp: number;
    status?: TMessageStatus;
}
