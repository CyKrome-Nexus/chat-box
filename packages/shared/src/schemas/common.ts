import { z } from "zod";

import { LIMITS } from "../constants";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const emailSchema = z.email("Enter a valid email").trim().toLowerCase().max(254);

export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Use international format, e.g. +14155550123"));

export const passwordSchema = z
  .string()
  .min(LIMITS.passwordMin, `At least ${LIMITS.passwordMin} characters`)
  .max(LIMITS.passwordMax)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const nameSchema = z.string().trim().min(1, "Name is required").max(LIMITS.nameMax);

export const handleSchema = z
  .string()
  .trim()
  .min(LIMITS.handleMin, `Must be ${LIMITS.handleMin}–${LIMITS.handleMax} characters`)
  .max(LIMITS.handleMax, `Must be ${LIMITS.handleMin}–${LIMITS.handleMax} characters`)
  .regex(/^[A-Za-z]/, "Must start with a letter")
  .regex(/^[A-Za-z0-9_]+$/, "Only letters, numbers and underscores")
  .refine((value) => !value.includes("__"), "Can't contain consecutive underscores")
  .transform((value) => value.toLowerCase());

export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(30),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(64),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const idParamsSchema = z.object({ id: objectIdSchema });

export type CursorQuery = z.infer<typeof cursorQuerySchema>;
