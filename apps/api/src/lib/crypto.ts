import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import { env } from "@/config/env";

const messageKey = Buffer.from(env.MESSAGE_ENCRYPTION_KEY, "base64");
const CIPHER_PREFIX = "v1";

export const randomToken = (bytes = 32): string => randomBytes(bytes).toString("base64url");

export const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

export const randomDigits = (length: number): string =>
  Array.from({ length }, () => randomInt(0, 10).toString()).join("");

export const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const hmacSha1Base64 = (secret: string, value: string): string =>
  createHmac("sha1", secret).update(value).digest("base64");

// AES-256-GCM for message bodies at rest; format: v1.<iv>.<tag>.<ciphertext> (base64url).
export const encryptAtRest = (plaintext: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", messageKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [CIPHER_PREFIX, iv, tag, ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
};

export const decryptAtRest = (payload: string): string => {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== CIPHER_PREFIX || !iv || !tag || ciphertext === undefined) return payload;
  const decipher = createDecipheriv("aes-256-gcm", messageKey, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString(
    "utf8",
  );
};
