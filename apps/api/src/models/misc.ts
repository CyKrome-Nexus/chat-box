import { Schema, model, type Types } from "mongoose";

import type { CallStatus, CallType } from "@chatbox/shared";

import type { AttachmentDoc } from "./message";

export interface MediaDoc {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  key: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

const mediaSchema = new Schema<MediaDoc>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    key: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
mediaSchema.index({ ownerId: 1, createdAt: -1 });

export const Media = model<MediaDoc>("Media", mediaSchema);

export interface ContactDoc {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  userId: Types.ObjectId;
  nickname?: string | null;
  createdAt: Date;
}

const contactSchema = new Schema<ContactDoc>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    nickname: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
contactSchema.index({ ownerId: 1, userId: 1 }, { unique: true });
contactSchema.index({ userId: 1 });

export const Contact = model<ContactDoc>("Contact", contactSchema);

export interface CallDoc {
  _id: Types.ObjectId;
  callId: string;
  conversationId: Types.ObjectId;
  type: CallType;
  initiatorId: Types.ObjectId;
  participantIds: Types.ObjectId[];
  joinedIds: Types.ObjectId[];
  status: CallStatus;
  startedAt: Date;
  answeredAt?: Date | null;
  endedAt?: Date | null;
}

const callSchema = new Schema<CallDoc>({
  callId: { type: String, required: true, unique: true },
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
  type: { type: String, enum: ["audio", "video"], required: true },
  initiatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  participantIds: { type: [Schema.Types.ObjectId], default: [] },
  joinedIds: { type: [Schema.Types.ObjectId], default: [] },
  status: { type: String, required: true },
  startedAt: { type: Date, required: true },
  answeredAt: Date,
  endedAt: Date,
});
callSchema.index({ participantIds: 1, startedAt: -1 });

export const Call = model<CallDoc>("Call", callSchema);

export interface DeviceDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sessionId?: Types.ObjectId | null;
  pushToken: string;
  platform: "ios" | "android" | "web";
  updatedAt: Date;
}

const deviceSchema = new Schema<DeviceDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session" },
    pushToken: { type: String, required: true, unique: true },
    platform: { type: String, enum: ["ios", "android", "web"], required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const Device = model<DeviceDoc>("Device", deviceSchema);

export interface StoryDoc {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  kind: "image" | "video" | "text";
  media?: AttachmentDoc | null;
  text?: string | null;
  backgroundColor?: string | null;
  audienceUserIds?: Types.ObjectId[] | null;
  views: { userId: Types.ObjectId; viewedAt: Date }[];
  expiresAt: Date;
  createdAt: Date;
}

const storySchema = new Schema<StoryDoc>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["image", "video", "text"], required: true },
    media: {
      type: new Schema(
        {
          kind: String,
          key: String,
          url: String,
          name: String,
          mimeType: String,
          size: Number,
          width: Number,
          height: Number,
          durationSeconds: Number,
          viewOnce: Boolean,
        },
        { _id: false },
      ),
    },
    text: String,
    backgroundColor: String,
    audienceUserIds: { type: [Schema.Types.ObjectId], default: undefined },
    views: {
      type: [new Schema({ userId: Schema.Types.ObjectId, viewedAt: Date }, { _id: false })],
      default: [],
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
storySchema.index({ authorId: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Story = model<StoryDoc>("Story", storySchema);

export interface PasswordResetDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
}

const passwordResetSchema = new Schema<PasswordResetDoc>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = model<PasswordResetDoc>("PasswordReset", passwordResetSchema);

export interface EmailVerificationDoc {
  _id: Types.ObjectId;
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
}

const emailVerificationSchema = new Schema<EmailVerificationDoc>({
  email: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailVerification = model<EmailVerificationDoc>("EmailVerification", emailVerificationSchema);
