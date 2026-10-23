import { Schema, model, type Types } from "mongoose";

export interface SessionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  previousTokenHash?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
}

const sessionSchema = new Schema<SessionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    previousTokenHash: { type: String, index: true },
    deviceName: String,
    platform: String,
    userAgent: String,
    ip: String,
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, required: true },
    revokedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model<SessionDoc>("Session", sessionSchema);
