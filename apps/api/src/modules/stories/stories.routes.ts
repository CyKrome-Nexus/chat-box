import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createStorySchema, idParamsSchema } from "@chatbox/shared";

import { authOf, requireAuth } from "@/plugins/auth";
import * as stories from "./stories.service";

export const storyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", requireAuth);

  app.get("/", async (request) => ({ items: await stories.storyFeed(authOf(request).userId) }));

  app.post(
    "/",
    { schema: { body: createStorySchema }, config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (request, reply) =>
      reply.status(201).send(await stories.createStory(authOf(request).userId, request.body)),
  );

  app.post("/:id/views", { schema: { params: idParamsSchema } }, async (request, reply) => {
    await stories.viewStory(authOf(request).userId, request.params.id);
    return reply.status(204).send();
  });

  app.get("/:id/views", { schema: { params: idParamsSchema } }, async (request) => ({
    items: await stories.storyViewers(authOf(request).userId, request.params.id),
  }));

  app.delete("/:id", { schema: { params: idParamsSchema } }, async (request, reply) => {
    await stories.deleteStory(authOf(request).userId, request.params.id);
    return reply.status(204).send();
  });
};
