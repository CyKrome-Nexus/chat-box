import { z } from "zod";

import { LIMITS } from "../constants";
import { objectIdSchema } from "./common";

export const messageKindSchema = z.enum([
  "text",
  "image",
  "video",
  "audio",
  "document",
  "location",
  "sticker",
  "video_note",
  "contact",
  "poll",
  "system",
]);

export const attachmentKindSchema = z.enum(["image", "video", "audio", "document", "sticker", "video_note"]);

export const attachmentInputSchema = z.object({
  kind: attachmentKindSchema,
  key: z.string().min(1).max(512),
  name: z.string().trim().max(255).optional(),
  mimeType: z.string().max(128),
  size: z.number().int().nonnegative().max(LIMITS.uploadBytesMax),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  durationSeconds: z
    .number()
    .nonnegative()
    .max(24 * 60 * 60)
    .optional(),
  waveform: z.array(z.number().min(0).max(1)).max(256).optional(),
  viewOnce: z.boolean().optional(),
});

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().trim().max(200).optional(),
});

export const sharedContactSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.nameMax),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().max(254).optional(),
  userId: objectIdSchema.optional(),
});

export const stickerSchema = z.object({
  id: z.string().trim().min(1).max(64),
  emoji: z.string().max(16).optional(),
});

export const pollInputSchema = z.object({
  question: z.string().trim().min(1).max(LIMITS.pollQuestionMax),
  options: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(LIMITS.pollOptionMax),
        description: z.string().trim().max(LIMITS.pollOptionMax).optional(),
      }),
    )
    .min(LIMITS.pollOptionsMin)
    .max(LIMITS.pollOptionsMax),
  allowMultiple: z.boolean().default(false),
});

export const sendMessageSchema = z
  .object({
    conversationId: objectIdSchema,
    clientId: z.string().trim().min(8).max(64),
    kind: messageKindSchema.exclude(["system"]),
    text: z.string().max(LIMITS.messageTextMax).optional(),
    attachments: z.array(attachmentInputSchema).max(LIMITS.attachmentsPerMessage).optional(),
    location: locationSchema.optional(),
    contact: sharedContactSchema.optional(),
    poll: pollInputSchema.optional(),
    sticker: stickerSchema.optional(),
    replyToId: objectIdSchema.optional(),
  })
  .superRefine((body, ctx) => {
    const hasText = Boolean(body.text?.trim());
    const hasAttachments = Boolean(body.attachments?.length);
    const requirement: Record<string, boolean> = {
      text: hasText,
      location: Boolean(body.location),
      contact: Boolean(body.contact),
      poll: Boolean(body.poll),
      sticker: Boolean(body.sticker) || hasAttachments,
    };
    const ok = body.kind in requirement ? requirement[body.kind] : hasAttachments;
    if (!ok) ctx.addIssue({ code: "custom", message: `Missing content for a ${body.kind} message` });
  });

export const editMessageSchema = z.object({
  text: z.string().trim().min(1).max(LIMITS.messageTextMax),
});

export const deleteMessageQuerySchema = z.object({
  scope: z.enum(["me", "everyone"]).default("me"),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(16).nullable(),
});

export const pollVoteSchema = z.object({
  optionIds: z.array(z.string().min(1).max(32)).max(LIMITS.pollOptionsMax),
});

export const listMessagesQuerySchema = z.object({
  before: objectIdSchema.optional(),
  after: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(40),
});

export const sharedMediaQuerySchema = z.object({
  kind: z.enum(["media", "document", "audio"]).default("media"),
  before: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(40),
});

export const forwardMessageSchema = z.object({
  conversationIds: z.array(objectIdSchema).min(1).max(5),
});

export type MessageKind = z.infer<typeof messageKindSchema>;
export type AttachmentKind = z.infer<typeof attachmentKindSchema>;
export type AttachmentInput = z.infer<typeof attachmentInputSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type SharedContactInput = z.infer<typeof sharedContactSchema>;
export type StickerInput = z.infer<typeof stickerSchema>;
export type PollInput = z.infer<typeof pollInputSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
