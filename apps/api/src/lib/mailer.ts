import { importPKCS8, SignJWT } from "jose";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors";

export type OtpPurpose = "verify-email" | "reset-password";

const AUDIENCE = "cykrome:service-email";

let signingKey: ReturnType<typeof importPKCS8> | null = null;

const toPem = (base64: string) =>
  `-----BEGIN PRIVATE KEY-----\n${base64
    .replace(/\s/g, "")
    .match(/.{1,64}/g)
    ?.join("\n")}\n-----END PRIVATE KEY-----`;

// Emails are rendered and sent by the CyKrome core service; each request is signed with this service's key.
export const sendOtpEmail = async (
  to: string,
  otp: string,
  purpose: OtpPurpose,
  expiryMinutes: number,
  log: (message: string) => void,
): Promise<void> => {
  if (!env.EMAIL_SERVICE_KEY_ID || !env.EMAIL_SERVICE_PRIVATE_KEY) {
    if (env.NODE_ENV === "production")
      throw new AppError(
        503,
        "EMAIL_UNAVAILABLE",
        "Email is not available right now. Please try again later.",
      );
    log(`Email not configured; ${purpose} code for ${to}: ${otp}`);
    return;
  }

  signingKey ??= importPKCS8(toPem(env.EMAIL_SERVICE_PRIVATE_KEY), "ES256");
  const token = await new SignJWT({ to, otp, purpose, expiryMinutes })
    .setProtectedHeader({ alg: "ES256", kid: env.EMAIL_SERVICE_KEY_ID })
    .setIssuer(env.EMAIL_SERVICE_KEY_ID)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(await signingKey);

  const response = await fetch(new URL("/api/internal/service-email/otp", env.EMAIL_SERVICE_URL), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!response?.ok) {
    log(`Email service rejected ${purpose} email: HTTP ${response?.status ?? "unreachable"}`);
    throw new AppError(503, "EMAIL_UNAVAILABLE", "We couldn't send the email. Please try again in a moment.");
  }
};
