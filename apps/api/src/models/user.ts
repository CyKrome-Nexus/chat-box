import { Schema, model, type Types } from "mongoose";

import type { PrivacySettings, SocialProvider, UserRole } from "@chatbox/shared";

export interface StoredFile {
  key: string;
  url: string;
}

export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  handle?: string | null;
  email?: string | null;
  phone?: string | null;
  passwordHash?: string | null;
  avatar?: StoredFile | null;
  about?: string | null;
  role: UserRole;
  providers: { provider: SocialProvider; providerId: string }[];
  privacy: PrivacySettings;
  blockedUserIds: Types.ObjectId[];
  lastSeenAt?: Date | null;
  disabledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const visibility = { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" } as const;

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    handle: { type: String, lowercase: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    avatar: { key: String, url: String },
    about: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    providers: [
      {
        _id: false,
        provider: { type: String, enum: ["google", "apple", "facebook"], required: true },
        providerId: { type: String, required: true },
      },
    ],
    privacy: {
      lastSeen: visibility,
      profilePhoto: visibility,
      about: visibility,
      readReceipts: { type: Boolean, default: true },
      discoverableByPhone: { type: Boolean, default: true },
      discoverableByEmail: { type: Boolean, default: true },
    },
    blockedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastSeenAt: Date,
    disabledAt: Date,
  },
  { timestamps: true },
);

const unique = (field: string) => ({
  unique: true,
  partialFilterExpression: { [field]: { $type: "string" } },
});
userSchema.index({ handle: 1 }, unique("handle"));
userSchema.index({ email: 1 }, unique("email"));
userSchema.index({ phone: 1 }, unique("phone"));
userSchema.index(
  { "providers.provider": 1, "providers.providerId": 1 },
  { unique: true, partialFilterExpression: { "providers.providerId": { $exists: true } } },
);
userSchema.index({ name: "text", handle: "text" });

export const User = model<UserDoc>("User", userSchema);
