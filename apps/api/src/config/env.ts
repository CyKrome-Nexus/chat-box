import { z } from "zod";

const listOf = (fallback = "") =>
  z
    .string()
    .default(fallback)
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );

const list = listOf();

const boolean = z
  .enum(["true", "false", "1", "0"])
  .default("false")
  .transform((value) => value === "true" || value === "1");

const base64Key = z
  .string()
  .refine((value) => Buffer.from(value, "base64").length === 32, "Must be 32 bytes, base64 encoded");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    TRUST_PROXY: boolean,

    PUBLIC_API_URL: z.url().default("http://localhost:4000"),
    CORS_ORIGINS: list,

    MONGODB_URI: z.string().min(1),
    REDIS_URL: z.string().optional(),

    JWT_ACCESS_SECRET: z.string().min(32, "Use at least 32 random characters"),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SECURE: boolean,
    MESSAGE_ENCRYPTION_KEY: base64Key,

    ADMIN_EMAILS: list,

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    UPLOAD_DIR: z.string().default("./uploads"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_URL: z.string().optional(),
    S3_FORCE_PATH_STYLE: boolean,

    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string().default("Chatbox <no-reply@localhost>"),

    EXPO_ACCESS_TOKEN: z.string().optional(),

    GOOGLE_CLIENT_IDS: list,
    APPLE_CLIENT_IDS: list,
    FACEBOOK_APP_ID: z.string().optional(),
    FACEBOOK_APP_SECRET: z.string().optional(),

    STUN_URLS: listOf("stun:stun.l.google.com:19302"),
    TURN_URLS: list,
    TURN_SECRET: z.string().optional(),
    TURN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(6 * 60 * 60),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === "s3") {
      for (const key of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_URL"] as const) {
        if (!env[key])
          ctx.addIssue({ code: "custom", path: [key], message: "Required when STORAGE_DRIVER=s3" });
      }
    }
    if (env.TURN_URLS.length > 0 && !env.TURN_SECRET) {
      ctx.addIssue({ code: "custom", path: ["TURN_SECRET"], message: "Required when TURN_URLS is set" });
    }
  });

export type Env = z.infer<typeof envSchema>;

export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
};

export const env: Env = loadEnv();
