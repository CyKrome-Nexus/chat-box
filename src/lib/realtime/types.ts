export type TConnectionStatus = "idle" | "connecting" | "online" | "offline";

export interface IMessageSendEvent {
    conversationId: string;
    messageId: string;
    text: string;
    senderId: string;
    timestamp: number;
}

export interface IMessageReceiveEvent {
    conversationId: string;
    messageId: string;
    text: string;
    senderId: string;
    timestamp: number;
}

export interface ITypingEvent {
    conversationId: string;
    userId: string;
    isTyping: boolean;
}

export interface IReadReceiptEvent {
    conversationId: string;
    messageId: string;
    readerId: string;
}

export interface IPresenceEvent {
    userId: string;
    status: "online" | "offline";
    lastSeen?: number;
}

export interface IServerToClientEvents {
    "message:receive": (payload: IMessageReceiveEvent) => void;
    "message:ack": (payload: { messageId: string; conversationId: string }) => void;
    "typing:update": (payload: ITypingEvent) => void;
    "receipt:read": (payload: IReadReceiptEvent) => void;
    "presence:update": (payload: IPresenceEvent) => void;
}

export interface IClientToServerEvents {
    "message:send": (payload: IMessageSendEvent) => void;
    "typing:update": (payload: ITypingEvent) => void;
    "receipt:read": (payload: IReadReceiptEvent) => void;
}
