import type { CallType } from "./schemas/misc";
import type { SendMessageInput } from "./schemas/messages";
import type { Conversation, Message, Poll, Reaction, Story } from "./types";

export type Ack<T = undefined> = (
  response: { ok: true; data: T } | { ok: false; error: { code: string; message: string } },
) => void;

export interface ReceiptPayload {
  conversationId: string;
  userId: string;
  messageId: string;
  status: "delivered" | "read";
  at: string;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresencePayload {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
}

export interface CallInvitePayload {
  callId: string;
  conversationId: string;
  type: CallType;
  from: { id: string; name: string; avatarUrl: string | null };
  participantIds: string[];
}

export interface CallSignalPayload {
  callId: string;
  fromUserId: string;
  toUserId: string;
  sdp?: string;
  sdpType?: "offer" | "answer";
  candidate?: { candidate: string; sdpMLineIndex: number | null; sdpMid: string | null };
}

export interface CallStatePayload {
  callId: string;
  conversationId: string;
  userId: string;
  state: "accepted" | "declined" | "ended" | "busy" | "missed";
}

export interface CallMediaPayload {
  callId: string;
  userId: string;
  audioMuted: boolean;
  videoEnabled: boolean;
}

export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "message:updated": (message: Message) => void;
  "message:deleted": (payload: { conversationId: string; messageId: string }) => void;
  "message:reactions": (payload: {
    conversationId: string;
    messageId: string;
    reactions: Reaction[];
  }) => void;
  "poll:updated": (payload: { conversationId: string; messageId: string; poll: Poll }) => void;
  "receipt:update": (payload: ReceiptPayload) => void;
  "typing:update": (payload: TypingPayload) => void;
  "presence:update": (payload: PresencePayload) => void;
  "conversation:upsert": (conversation: Conversation) => void;
  "conversation:removed": (payload: { conversationId: string }) => void;
  "story:new": (story: Story) => void;
  "call:incoming": (payload: CallInvitePayload) => void;
  "call:signal": (payload: CallSignalPayload) => void;
  "call:state": (payload: CallStatePayload) => void;
  "call:media": (payload: CallMediaPayload) => void;
  "session:revoked": () => void;
}

export interface ClientToServerEvents {
  "message:send": (payload: SendMessageInput, ack: Ack<Message>) => void;
  "message:read": (payload: { conversationId: string; messageId: string }) => void;
  "message:delivered": (payload: { conversationId: string; messageId: string }) => void;
  "typing:update": (payload: { conversationId: string; isTyping: boolean }) => void;
  "presence:subscribe": (payload: { userIds: string[] }, ack: Ack<PresencePayload[]>) => void;
  "call:invite": (
    payload: { conversationId: string; type: CallType },
    ack: Ack<{ callId: string; participantIds: string[] }>,
  ) => void;
  "call:signal": (payload: Omit<CallSignalPayload, "fromUserId">) => void;
  "call:accept": (payload: { callId: string }) => void;
  "call:decline": (payload: { callId: string; busy?: boolean }) => void;
  "call:end": (payload: { callId: string }) => void;
  "call:media": (payload: Omit<CallMediaPayload, "userId">) => void;
}

export interface SocketAuth {
  token: string;
}
