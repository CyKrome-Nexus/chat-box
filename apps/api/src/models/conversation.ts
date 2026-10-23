import { Schema, model, type Types } from "mongoose";

import type { ConversationType, MemberRole, MessageKind } from "@chatbox/shared";

import type { StoredFile } from "./user";

export interface MemberDoc {
  userId: Types.ObjectId;
  role: MemberRole;
  joinedAt: Date;
  unreadCount: number;
  lastReadMessageId?: Types.ObjectId | null;
  lastReadAt?: Date | null;
  lastDeliveredAt?: Date | null;
  clearedAt?: Date | null;
  mutedUntil?: Date | null;
  hidden: boolean;
}

export interface LastMessageDoc {
  messageId: Types.ObjectId;
  senderId?: Types.ObjectId | null;
  senderName?: string | null;
  kind: MessageKind;
  text?: string | null;
  deleted: boolean;
  createdAt: Date;
}

export interface ConversationDoc {
  _id: Types.ObjectId;
  type: ConversationType;
  directKey?: string | null;
  name?: string | null;
  description?: string | null;
  avatar?: StoredFile | null;
  tags: string[];
  members: MemberDoc[];
  settings: {
    onlyAdminsCanSend: boolean;
    onlyAdminsCanEditInfo: boolean;
    onlyAdminsCanAddMembers: boolean;
  };
  inviteCode?: string | null;
  disappearingSeconds?: number | null;
  lastMessage?: LastMessageDoc | null;
  lastActivityAt: Date;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<MemberDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
    joinedAt: { type: Date, default: () => new Date() },
    unreadCount: { type: Number, default: 0 },
    lastReadMessageId: { type: Schema.Types.ObjectId },
    lastReadAt: Date,
    lastDeliveredAt: Date,
    clearedAt: Date,
    mutedUntil: Date,
    hidden: { type: Boolean, default: false },
  },
  { _id: false },
);

const conversationSchema = new Schema<ConversationDoc>(
  {
    type: { type: String, enum: ["direct", "group"], required: true },
    directKey: { type: String },
    name: { type: String, trim: true },
    description: String,
    avatar: { key: String, url: String },
    tags: { type: [String], default: [] },
    members: { type: [memberSchema], default: [] },
    settings: {
      onlyAdminsCanSend: { type: Boolean, default: false },
      onlyAdminsCanEditInfo: { type: Boolean, default: true },
      onlyAdminsCanAddMembers: { type: Boolean, default: true },
    },
    inviteCode: { type: String },
    disappearingSeconds: { type: Number },
    lastMessage: {
      type: new Schema<LastMessageDoc>(
        {
          messageId: { type: Schema.Types.ObjectId, required: true },
          senderId: Schema.Types.ObjectId,
          senderName: String,
          kind: { type: String, required: true },
          text: String,
          deleted: { type: Boolean, default: false },
          createdAt: { type: Date, required: true },
        },
        { _id: false },
      ),
    },
    lastActivityAt: { type: Date, default: () => new Date() },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

conversationSchema.index({ "members.userId": 1, lastActivityAt: -1 });
conversationSchema.index(
  { directKey: 1 },
  { unique: true, partialFilterExpression: { directKey: { $type: "string" } } },
);
conversationSchema.index(
  { inviteCode: 1 },
  { unique: true, partialFilterExpression: { inviteCode: { $type: "string" } } },
);

export const Conversation = model<ConversationDoc>("Conversation", conversationSchema);

export const directKeyFor = (a: string, b: string): string => [a, b].sort().join(":");
