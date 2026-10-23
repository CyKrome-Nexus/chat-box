import { z } from "zod";

import { emailSchema, nameSchema, passwordSchema, phoneSchema } from "./common";

export const identifierSchema = z
  .string()
  .trim()
  .min(3, "Enter your email or phone number")
  .max(254)
  .transform((value) => (value.includes("@") ? value.toLowerCase() : value.replace(/[\s()-]/g, "")));

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    password: passwordSchema,
  })
  .refine((body) => Boolean(body.email || body.phone), {
    message: "Provide an email or phone number",
    path: ["email"],
  });

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Enter your password").max(256),
});

export const socialProviderSchema = z.enum(["google", "apple", "facebook"]);

export const socialLoginSchema = z.object({
  provider: socialProviderSchema,
  token: z.string().min(10).max(8192),
  name: nameSchema.optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(512).optional(),
});

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});

export const resetPasswordSchema = z.object({
  identifier: identifierSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().max(256).optional(),
  newPassword: passwordSchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().max(256).optional(),
});

export const deviceInfoSchema = z.object({
  deviceName: z.string().trim().max(80).optional(),
  platform: z.enum(["ios", "android", "web"]).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SocialProvider = z.infer<typeof socialProviderSchema>;
export type SocialLoginInput = z.infer<typeof socialLoginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
