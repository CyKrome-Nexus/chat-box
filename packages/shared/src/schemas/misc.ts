import { z } from "zod";

import { LIMITS } from "../constants";
import { objectIdSchema } from "./common";
import { attachmentInputSchema } from "./messages";

export const callTypeSchema = z.enum(["audio", "video"]);

export const registerDeviceSchema = z.object({
  pushToken: z.string().trim().min(10).max(256),
  platform: z.enum(["ios", "android", "web"]),
});

export const createStorySchema = z
  .object({
    kind: z.enum(["image", "video", "text"]),
    media: attachmentInputSchema.optional(),
    text: z.string().trim().max(LIMITS.storyTextMax).optional(),
    backgroundColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    audienceUserIds: z.array(objectIdSchema).max(LIMITS.groupMembersMax).optional(),
  })
  .refine((body) => (body.kind === "text" ? Boolean(body.text) : Boolean(body.media)), {
    message: "A story needs text or media",
  });

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const adminUpdateUserSchema = z.object({
  disabled: z.boolean().optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export type CallType = z.infer<typeof callTypeSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
