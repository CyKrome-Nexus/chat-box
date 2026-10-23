import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  addContactSchema,
  discoverSchema,
  handleAvailabilityQuerySchema,
  idParamsSchema,
  searchQuerySchema,
  updatePrivacySchema,
  updateProfileSchema,
} from "@chatbox/shared";

import { authOf, requireAuth } from "@/plugins/auth";
import { uploadAvatar } from "@/modules/media/media.service";
import * as users from "./users.service";

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", requireAuth);

  app.get("/me", async (request) => users.getMe(authOf(request).userId));

  app.patch("/me", { schema: { body: updateProfileSchema } }, async (request) =>
    users.updateMe(authOf(request).userId, request.body),
  );

  app.patch("/me/privacy", { schema: { body: updatePrivacySchema } }, async (request) =>
    users.updatePrivacy(authOf(request).userId, request.body),
  );

  app.put("/me/avatar", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request) => {
    const file = await request.file();
    return uploadAvatar(authOf(request).userId, file);
  });

  app.get(
    "/handle-availability",
    { schema: { querystring: handleAvailabilityQuerySchema } },
    async (request) => ({
      handle: request.query.handle,
      available: await users.isHandleAvailable(request.query.handle, authOf(request).userId),
    }),
  );

  app.get("/search", { schema: { querystring: searchQuerySchema } }, async (request) => ({
    items: await users.searchUsers(authOf(request).userId, request.query.q, request.query.limit),
  }));

  app.post(
    "/discover",
    { schema: { body: discoverSchema }, config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (request) => ({ items: await users.discover(authOf(request).userId, request.body) }),
  );

  app.get("/blocked", async (request) => ({ items: await users.listBlocked(authOf(request).userId) }));

  app.get(
    "/by-handle/:handle",
    { schema: { params: z.object({ handle: z.string().min(1).max(40) }) } },
    async (request) => users.getUserByHandle(authOf(request).userId, request.params.handle),
  );

  app.get("/:id", { schema: { params: idParamsSchema } }, async (request) =>
    users.getUser(authOf(request).userId, request.params.id),
  );

  app.put("/:id/block", { schema: { params: idParamsSchema } }, async (request, reply) => {
    await users.setBlocked(authOf(request).userId, request.params.id, true);
    return reply.status(204).send();
  });

  app.delete("/:id/block", { schema: { params: idParamsSchema } }, async (request, reply) => {
    await users.setBlocked(authOf(request).userId, request.params.id, false);
    return reply.status(204).send();
  });
};

export const contactRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", requireAuth);

  app.get("/", async (request) => ({ items: await users.listContacts(authOf(request).userId) }));

  app.post("/", { schema: { body: addContactSchema } }, async (request, reply) =>
    reply
      .status(201)
      .send(await users.addContact(authOf(request).userId, request.body.userId, request.body.nickname)),
  );

  app.delete("/:id", { schema: { params: idParamsSchema } }, async (request, reply) => {
    await users.removeContact(authOf(request).userId, request.params.id);
    return reply.status(204).send();
  });
};
