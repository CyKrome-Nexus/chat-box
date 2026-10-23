import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { registerDeviceSchema } from "@chatbox/shared";

import { toObjectId } from "@/lib/viewer";
import { Device } from "@/models/misc";
import { authOf, requireAuth } from "@/plugins/auth";

export const deviceRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", requireAuth);

  app.put("/", { schema: { body: registerDeviceSchema } }, async (request, reply) => {
    const { userId, sessionId } = authOf(request);
    await Device.findOneAndUpdate(
      { pushToken: request.body.pushToken },
      {
        $set: {
          userId: toObjectId(userId),
          sessionId: toObjectId(sessionId),
          platform: request.body.platform,
        },
      },
      { upsert: true },
    );
    return reply.status(204).send();
  });

  app.delete(
    "/",
    { schema: { body: z.object({ pushToken: z.string().min(10).max(256) }) } },
    async (request, reply) => {
      await Device.deleteOne({
        pushToken: request.body.pushToken,
        userId: toObjectId(authOf(request).userId),
      });
      return reply.status(204).send();
    },
  );
};
