import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import {
  deleteMessageQuerySchema,
  editMessageSchema,
  forwardMessageSchema,
  idParamsSchema,
  pollVoteSchema,
  reactionSchema,
  sendMessageSchema,
} from "@chatbox/shared";

import { authOf, requireAuth } from "@/plugins/auth";
import * as messages from "./messages.service";

export const messageRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", requireAuth);

  app.post(
    "/",
    { schema: { body: sendMessageSchema }, config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) =>
      reply.status(201).send(await messages.sendMessage(authOf(request).userId, request.body)),
  );

  app.patch("/:id", { schema: { params: idParamsSchema, body: editMessageSchema } }, async (request) =>
    messages.editMessage(authOf(request).userId, request.params.id, request.body.text),
  );

  app.delete(
    "/:id",
    { schema: { params: idParamsSchema, querystring: deleteMessageQuerySchema } },
    async (request, reply) => {
      await messages.deleteMessage(authOf(request).userId, request.params.id, request.query.scope);
      return reply.status(204).send();
    },
  );

  app.put(
    "/:id/reaction",
    { schema: { params: idParamsSchema, body: reactionSchema } },
    async (request, reply) => {
      await messages.reactToMessage(authOf(request).userId, request.params.id, request.body.emoji);
      return reply.status(204).send();
    },
  );

  app.put(
    "/:id/vote",
    { schema: { params: idParamsSchema, body: pollVoteSchema } },
    async (request, reply) => {
      await messages.votePoll(authOf(request).userId, request.params.id, request.body.optionIds);
      return reply.status(204).send();
    },
  );

  app.post(
    "/:id/forward",
    {
      schema: { params: idParamsSchema, body: forwardMessageSchema },
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request) => ({
      items: await messages.forwardMessage(
        authOf(request).userId,
        request.params.id,
        request.body.conversationIds,
      ),
    }),
  );
};
