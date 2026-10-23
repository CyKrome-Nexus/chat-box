import { Schema, model, type Types } from "mongoose";

import type { AttachmentKind, MessageKind } from "@chatbox/shared";

export interface AttachmentDoc {
  kind: AttachmentKind;
  key: string;
  url: string;
  name?: string | null;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  waveform?: number[] | null;
  viewOnce: boolean;
}

export interface PollOptionDoc {
  id: string;
  text: string;
  description?: string | null;
  voterIds: Types.ObjectId[];
}

export interface MessageDoc {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId?: Types.ObjectId | null;
  clientId?: string | null;
  kind: MessageKind;
  // Encrypted at rest — see lib/crypto.ts.
  text?: string | null;
  attachments: AttachmentDoc[];
  location?: { latitude: number; longitude: number; label?: string | null } | null;
  contact?: {
    name: string;
    phone?: string | null;
    email?: string | null;
    userId?: Types.ObjectId | null;
  } | null;
  poll?: {
    question: string;
    options: PollOptionDoc[];
    allowMultiple: boolean;
    closedAt?: Date | null;
  } | null;
  sticker?: { id: string; emoji?: string | null } | null;
  replyToId?: Types.ObjectId | null;
  reactions: { userId: Types.ObjectId; emoji: string }[];
  hiddenFor: Types.ObjectId[];
  editedAt?: Date | null;
  deletedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<AttachmentDoc>(
  {
    kind: { type: String, required: true },
    key: { type: String, required: true },
    url: { type: String, required: true },
    name: String,
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    width: Number,
    height: Number,
    durationSeconds: Number,
    waveform: { type: [Number], default: undefined },
    viewOnce: { type: Boolean, default: false },
  },
  { _id: false },
);

const messageSchema = new Schema<MessageDoc>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User" },
    clientId: String,
    kind: { type: String, required: true },
    text: String,
    attachments: { type: [attachmentSchema], default: [] },
    location: { type: new Schema({ latitude: Number, longitude: Number, label: String }, { _id: false }) },
    contact: {
      type: new Schema(
        { name: String, phone: String, email: String, userId: Schema.Types.ObjectId },
        { _id: false },
      ),
    },
    poll: {
      type: new Schema(
        {
          question: { type: String, required: true },
          options: [
            new Schema<PollOptionDoc>(
              {
                id: { type: String, required: true },
                text: { type: String, required: true },
                description: String,
                voterIds: { type: [Schema.Types.ObjectId], default: [] },
              },
              { _id: false },
            ),
          ],
          allowMultiple: { type: Boolean, default: false },
          closedAt: Date,
        },
        { _id: false },
      ),
    },
    sticker: { type: new Schema({ id: String, emoji: String }, { _id: false }) },
    replyToId: { type: Schema.Types.ObjectId },
    reactions: {
      type: [new Schema({ userId: Schema.Types.ObjectId, emoji: String }, { _id: false })],
      default: [],
    },
    hiddenFor: { type: [Schema.Types.ObjectId], default: [] },
    editedAt: Date,
    deletedAt: Date,
    expiresAt: Date,
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, _id: -1 });
messageSchema.index({ conversationId: 1, kind: 1, _id: -1 });
messageSchema.index(
  { senderId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: "string" } } },
);
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Message = model<MessageDoc>("Message", messageSchema);
