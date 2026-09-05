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

/** Long-press "Edit" — see docs/architecture/message-actions.md. */
export interface IMessageEditEvent {
    conversationId: string;
    messageId: string;
    text: string;
}

export interface IPresenceEvent {
    userId: string;
    status: "online" | "offline";
    lastSeen?: number;
}

/** WebRTC signaling — see docs/architecture/audio-calling-engine.md. */
export interface ICallSignalEvent {
    callId: string;
    conversationId: string;
    fromUserId: string;
    sdp?: string;
    type?: "offer" | "answer";
    candidate?: { candidate: string; sdpMLineIndex: number | null; sdpMid: string | null };
}

export interface ICallEndEvent {
    callId: string;
    conversationId: string;
    reason: "hangup" | "busy" | "declined";
}

export interface IServerToClientEvents {
    "message:receive": (payload: IMessageReceiveEvent) => void;
    "message:ack": (payload: { messageId: string; conversationId: string }) => void;
    "message:edit": (payload: IMessageEditEvent) => void;
    "typing:update": (payload: ITypingEvent) => void;
    "receipt:read": (payload: IReadReceiptEvent) => void;
    "presence:update": (payload: IPresenceEvent) => void;
    "call:offer": (payload: ICallSignalEvent) => void;
    "call:answer": (payload: ICallSignalEvent) => void;
    "call:ice-candidate": (payload: ICallSignalEvent) => void;
    "call:end": (payload: ICallEndEvent) => void;
}

export interface IClientToServerEvents {
    "message:send": (payload: IMessageSendEvent) => void;
    "message:edit": (payload: IMessageEditEvent) => void;
    "typing:update": (payload: ITypingEvent) => void;
    "receipt:read": (payload: IReadReceiptEvent) => void;
    "call:offer": (payload: ICallSignalEvent) => void;
    "call:answer": (payload: ICallSignalEvent) => void;
    "call:ice-candidate": (payload: ICallSignalEvent) => void;
    "call:end": (payload: ICallEndEvent) => void;
}
