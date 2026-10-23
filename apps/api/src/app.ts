import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import { API_VERSION, LIMITS } from "@chatbox/shared";

import { env } from "@/config/env";
import { isDatabaseReady } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getRedis } from "@/lib/redis";
import { adminRoutes } from "@/modules/admin/admin.routes";
import { authRoutes } from "@/modules/auth/auth.routes";
import { callRoutes } from "@/modules/calls/calls.routes";
import { conversationRoutes, inviteRoutes } from "@/modules/conversations/conversations.routes";
import { deviceRoutes } from "@/modules/devices/devices.routes";
import { fileRoutes, mediaRoutes } from "@/modules/media/media.routes";
import { messageRoutes } from "@/modules/messages/messages.routes";
import { storyRoutes } from "@/modules/stories/stories.routes";
import { contactRoutes, userRoutes } from "@/modules/users/users.routes";
import { corsOriginsFrom } from "@/realtime";

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? { level: env.LOG_LEVEL, transport: { target: "pino-pretty" } }
        : {
            level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
            redact: ["req.headers.authorization", "req.headers.cookie"],
          },
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 1024 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest("auth", null);

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  await app.register(cors, {
    origin: corsOriginsFrom(env.CORS_ORIGINS),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["authorization", "content-type", "x-auth-mode"],
    maxAge: 600,
  });
  await app.register(cookie);
  if (env.NODE_ENV !== "test")
    await app.register(rateLimit, {
      global: true,
      max: 600,
      timeWindow: "1 minute",
      redis: getRedis() ?? undefined,
      nameSpace: "chatbox-rl:",
      enableDraftSpec: true,
      keyGenerator: (request) => request.ip,
    });
  await app.register(multipart, { limits: { fileSize: LIMITS.uploadBytesMax, files: 1, fields: 5 } });

  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const first = error.validation[0];
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: first?.message ?? "Invalid request",
          details: error.validation,
        },
      });
    }
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send({ error: { code: error.code, message: error.message, details: error.details } });
    }
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) request.log.error(error);
    return reply.status(statusCode).send({
      error: {
        code: error.code ?? (statusCode === 429 ? "RATE_LIMITED" : "INTERNAL"),
        message: statusCode >= 500 ? "Something went wrong" : error.message,
      },
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({ error: { code: "NOT_FOUND", message: "Route not found" } }),
  );

  const startedAt = new Date().toISOString();
  app.get("/health", { config: { rateLimit: false } }, async () => ({
    status: "ok",
    version: process.env.GIT_SHA ?? "dev",
    startedAt,
  }));
  app.get("/ready", { config: { rateLimit: false } }, async (_request, reply) => {
    const ready = isDatabaseReady();
    return reply.status(ready ? 200 : 503).send({ status: ready ? "ready" : "starting" });
  });

  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: "/auth" });
      await v1.register(userRoutes, { prefix: "/users" });
      await v1.register(contactRoutes, { prefix: "/contacts" });
      await v1.register(conversationRoutes, { prefix: "/conversations" });
      await v1.register(inviteRoutes, { prefix: "/invites" });
      await v1.register(messageRoutes, { prefix: "/messages" });
      await v1.register(mediaRoutes, { prefix: "/media" });
      await v1.register(callRoutes, { prefix: "/calls" });
      await v1.register(storyRoutes, { prefix: "/stories" });
      await v1.register(deviceRoutes, { prefix: "/devices" });
      await v1.register(adminRoutes, { prefix: "/admin" });
    },
    { prefix: `/${API_VERSION}` },
  );

  if (env.STORAGE_DRIVER === "local") await app.register(fileRoutes, { prefix: "/files" });

  return app;
};
