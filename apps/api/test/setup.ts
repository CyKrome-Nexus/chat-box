import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

import { inject, vi } from "vitest";

Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_URI: inject("mongoUri"),
  REDIS_URL: "",
  JWT_ACCESS_SECRET: randomBytes(48).toString("base64"),
  MESSAGE_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  PUBLIC_API_URL: "http://localhost:4000",
  UPLOAD_DIR: path.join(tmpdir(), "chatbox-test-uploads"),
  ADMIN_EMAILS: "admin@example.com",
  TURN_URLS: "turn:turn.example.com:3478",
  TURN_SECRET: "turn-secret",
});

vi.mock("@/lib/mailer", async () => {
  const { outbox } = await import("./outbox");
  return {
    sendOtpEmail: async (to: string, otp: string) => {
      outbox.set(to, otp);
    },
  };
});
