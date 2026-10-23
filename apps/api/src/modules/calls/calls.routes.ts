import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { authOf, requireAuth } from "@/plugins/auth";
import { callHistory, iceConfig } from "./calls.service";

export const callRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", requireAuth);

  app.get("/", async (request) => ({ items: await callHistory(authOf(request).userId) }));

  app.get("/ice-servers", async (request, reply) => {
    reply.header("cache-control", "no-store");
    return iceConfig(authOf(request).userId);
  });
};
