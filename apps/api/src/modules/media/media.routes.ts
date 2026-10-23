import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { notFound } from "@/lib/errors";
import { storage } from "@/lib/storage";
import { authOf, requireAuth } from "@/plugins/auth";
import { Media } from "@/models/misc";
import { isInlineMime, uploadMedia } from "./media.service";

export const mediaRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/",
    { onRequest: requireAuth, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) =>
      reply.status(201).send(await uploadMedia(authOf(request).userId, await request.file())),
  );
};

// Local-driver file serving; keys are unguessable capability URLs.
export const fileRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/*", { schema: { params: z.object({ "*": z.string().max(256) }) } }, async (request, reply) => {
    const key = request.params["*"];
    const found = await storage.read?.(key).catch(() => null);
    if (!found) throw notFound("File");

    const media = await Media.findOne({ key }, { mimeType: 1 }).lean();
    const mimeType = media?.mimeType ?? "application/octet-stream";

    reply
      .header("content-type", mimeType)
      .header("content-length", found.size)
      .header("cache-control", "public, max-age=31536000, immutable")
      .header("x-content-type-options", "nosniff")
      .header("content-security-policy", "default-src 'none'; sandbox")
      .header("cross-origin-resource-policy", "cross-origin");
    if (!isInlineMime(mimeType)) reply.header("content-disposition", "attachment");
    return reply.send(found.stream);
  });
};
