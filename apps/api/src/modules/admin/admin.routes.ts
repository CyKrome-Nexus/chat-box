import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { adminListQuerySchema, adminUpdateUserSchema, idParamsSchema, objectIdSchema } from "@chatbox/shared";

import { authOf, requireAdmin } from "@/plugins/auth";
import * as admin from "./admin.service";

export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", requireAdmin);
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });

  app.get("/stats", async () => admin.getStats());

  app.get("/users", { schema: { querystring: adminListQuerySchema } }, async (request) =>
    admin.listUsers(request.query),
  );

  app.patch(
    "/users/:id",
    { schema: { params: idParamsSchema, body: adminUpdateUserSchema } },
    async (request, reply) => {
      await admin.updateUser(authOf(request).userId, request.params.id, request.body);
      return reply.status(204).send();
    },
  );

  app.get("/conversations", { schema: { querystring: adminListQuerySchema } }, async (request) =>
    admin.listConversations(request.query),
  );

  app.get(
    "/messages",
    { schema: { querystring: adminListQuerySchema.extend({ conversationId: objectIdSchema.optional() }) } },
    async (request) => admin.listMessages(request.query),
  );
};
