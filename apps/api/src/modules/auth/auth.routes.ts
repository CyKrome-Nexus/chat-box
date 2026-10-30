import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  changePasswordSchema,
  deleteAccountSchema,
  deviceInfoSchema,
  emailCodeSchema,
  forgotPasswordSchema,
  idParamsSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  socialLoginSchema,
  type AuthTokens,
} from "@chatbox/shared";

import { env } from "@/config/env";
import { unauthorized } from "@/lib/errors";
import { authOf, requireAuth } from "@/plugins/auth";
import * as auth from "./auth.service";

const REFRESH_COOKIE = "chatbox_rt";
const COOKIE_PATH = "/v1/auth";

const strict = { rateLimit: { max: 10, timeWindow: "1 minute" } };
const veryStrict = { rateLimit: { max: 5, timeWindow: "15 minutes" } };

// Browsers opt into an httpOnly refresh cookie; native apps keep the token in secure storage.
const wantsCookie = (request: FastifyRequest) => request.headers["x-auth-mode"] === "cookie";

const deliverTokens = (request: FastifyRequest, reply: FastifyReply, tokens: AuthTokens): AuthTokens => {
  if (!wantsCookie(request)) return tokens;
  reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: COOKIE_PATH,
    domain: env.COOKIE_DOMAIN,
    expires: new Date(tokens.refreshTokenExpiresAt),
  });
  return { ...tokens, refreshToken: "" };
};

const meta = (request: FastifyRequest, device?: z.infer<typeof deviceInfoSchema>): auth.ClientMeta => ({
  ip: request.ip,
  userAgent: request.headers["user-agent"] ?? null,
  deviceName: device?.deviceName,
  platform: device?.platform ?? (wantsCookie(request) ? "web" : undefined),
});

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/email/code",
    { schema: { body: emailCodeSchema }, config: veryStrict },
    async (request, reply) => {
      await auth.requestEmailCode(request.body.email, (message) => request.log.warn(message));
      return reply.status(202).send({ message: "We sent a verification code to your email." });
    },
  );

  app.post(
    "/register",
    { schema: { body: registerSchema.and(deviceInfoSchema) }, config: strict },
    async (request, reply) => {
      const { sessionId: _session, ...result } = await auth.register(
        request.body,
        meta(request, request.body),
      );
      return reply.status(201).send({ ...result, tokens: deliverTokens(request, reply, result.tokens) });
    },
  );

  app.post(
    "/login",
    { schema: { body: loginSchema.and(deviceInfoSchema) }, config: strict },
    async (request, reply) => {
      const { sessionId: _session, ...result } = await auth.login(
        request.body.identifier,
        request.body.password,
        meta(request, request.body),
      );
      return { ...result, tokens: deliverTokens(request, reply, result.tokens) };
    },
  );

  app.post(
    "/social",
    { schema: { body: socialLoginSchema.and(deviceInfoSchema) }, config: strict },
    async (request, reply) => {
      const { sessionId: _session, ...result } = await auth.socialLogin(
        request.body,
        meta(request, request.body),
      );
      return { ...result, tokens: deliverTokens(request, reply, result.tokens) };
    },
  );

  app.post(
    "/refresh",
    {
      schema: { body: refreshSchema.nullish() },
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const token =
        request.body?.refreshToken ?? (wantsCookie(request) ? request.cookies[REFRESH_COOKIE] : undefined);
      if (!token) throw unauthorized();
      return deliverTokens(request, reply, await auth.refresh(token));
    },
  );

  app.post("/logout", { onRequest: requireAuth }, async (request, reply) => {
    await auth.revokeSession(authOf(request).sessionId);
    reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH, domain: env.COOKIE_DOMAIN });
    return reply.status(204).send();
  });

  app.post(
    "/password/forgot",
    { schema: { body: forgotPasswordSchema }, config: veryStrict },
    async (request, reply) => {
      await auth.requestPasswordReset(request.body.identifier, (message) => request.log.warn(message));
      return reply.status(202).send({ message: "If an account exists, a verification code has been sent." });
    },
  );

  app.post(
    "/password/reset",
    { schema: { body: resetPasswordSchema }, config: strict },
    async (request, reply) => {
      await auth.resetPassword(request.body.identifier, request.body.code, request.body.password);
      return reply.status(204).send();
    },
  );

  await app.register(securedAuthRoutes);
};

const securedAuthRoutes: FastifyPluginAsyncZod = async (secured) => {
  secured.addHook("onRequest", requireAuth);

  secured.post(
    "/password/change",
    { schema: { body: changePasswordSchema }, config: strict },
    async (request, reply) => {
      const { userId, sessionId } = authOf(request);
      await auth.changePassword(userId, sessionId, request.body);
      return reply.status(204).send();
    },
  );

  secured.get("/sessions", async (request) => {
    const { userId, sessionId } = authOf(request);
    return { items: await auth.listSessions(userId, sessionId) };
  });

  secured.delete("/sessions/:id", { schema: { params: idParamsSchema } }, async (request, reply) => {
    await auth.revokeSession(request.params.id, authOf(request).userId);
    return reply.status(204).send();
  });

  secured.post(
    "/account/delete",
    { schema: { body: deleteAccountSchema }, config: veryStrict },
    async (request, reply) => {
      await auth.deleteAccount(authOf(request).userId, request.body.password);
      reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH, domain: env.COOKIE_DOMAIN });
      return reply.status(204).send();
    },
  );
};
