import { z } from "zod";

import { LIMITS } from "../constants";
import { handleSchema, nameSchema, objectIdSchema, phoneSchema } from "./common";

export const visibilitySchema = z.enum(["everyone", "contacts", "nobody"]);

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  about: z.string().trim().max(LIMITS.aboutMax).nullable().optional(),
  handle: handleSchema.nullable().optional(),
  phone: phoneSchema.optional(),
});

export const updatePrivacySchema = z.object({
  lastSeen: visibilitySchema.optional(),
  profilePhoto: visibilitySchema.optional(),
  about: visibilitySchema.optional(),
  readReceipts: z.boolean().optional(),
  discoverableByPhone: z.boolean().optional(),
  discoverableByEmail: z.boolean().optional(),
});

export const handleAvailabilityQuerySchema = z.object({ handle: handleSchema });

export const discoverSchema = z.object({
  phones: z.array(z.string().trim().max(32)).max(LIMITS.discoverBatchMax).default([]),
  emails: z.array(z.string().trim().max(254)).max(LIMITS.discoverBatchMax).default([]),
});

export const addContactSchema = z.object({
  userId: objectIdSchema,
  nickname: z.string().trim().max(LIMITS.nameMax).optional(),
});

export type Visibility = z.infer<typeof visibilitySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
export type DiscoverInput = z.infer<typeof discoverSchema>;
export type AddContactInput = z.infer<typeof addContactSchema>;
