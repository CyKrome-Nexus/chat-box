import { z } from "zod";

import { LIMITS } from "../constants";
import { objectIdSchema } from "./common";

export const memberRoleSchema = z.enum(["owner", "admin", "member"]);

export const createDirectSchema = z.object({ userId: objectIdSchema });

export const groupSettingsSchema = z.object({
  onlyAdminsCanSend: z.boolean().optional(),
  onlyAdminsCanEditInfo: z.boolean().optional(),
  onlyAdminsCanAddMembers: z.boolean().optional(),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(LIMITS.groupNameMax),
  description: z.string().trim().max(LIMITS.groupDescriptionMax).optional(),
  tags: z.array(z.string().trim().min(1).max(LIMITS.groupTagMax)).max(LIMITS.groupTagsMax).default([]),
  memberIds: z
    .array(objectIdSchema)
    .min(1, "Add at least one member")
    .max(LIMITS.groupMembersMax - 1),
  settings: groupSettingsSchema.optional(),
});

export const updateConversationSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.groupNameMax).optional(),
  description: z.string().trim().max(LIMITS.groupDescriptionMax).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(LIMITS.groupTagMax)).max(LIMITS.groupTagsMax).optional(),
  settings: groupSettingsSchema.optional(),
  disappearingSeconds: z
    .number()
    .int()
    .min(0)
    .max(90 * 24 * 60 * 60)
    .nullable()
    .optional(),
});

export const addMembersSchema = z.object({
  userIds: z.array(objectIdSchema).min(1).max(256),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export const memberParamsSchema = z.object({
  id: objectIdSchema,
  userId: objectIdSchema,
});

export const inviteCodeParamsSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{8,32}$/, "Invalid invite code"),
});

export const markReadSchema = z.object({ messageId: objectIdSchema });

export const muteSchema = z.object({
  mutedUntil: z.iso.datetime().nullable(),
});

export type MemberRole = z.infer<typeof memberRoleSchema>;
export type GroupSettings = Required<z.infer<typeof groupSettingsSchema>>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
