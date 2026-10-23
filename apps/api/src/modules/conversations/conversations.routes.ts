import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  addMembersSchema,
  createDirectSchema,
  createGroupSchema,
  idParamsSchema,
  inviteCodeParamsSchema,
  listMessagesQuerySchema,
  markReadSchema,
  memberParamsSchema,
  muteSchema,
  sharedMediaQuerySchema,
  updateConversationSchema,
  updateMemberRoleSchema,
} from "@chatbox/shared";

import { authOf, requireAuth } from "@/plugins/auth";
import { listMessages, sharedMedia } from "@/modules/messages/messages.service";
import * as conversations from "./conversations.service";

export const conversationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", requireAuth);

  app.get("/", async (request) => ({ items: await conversations.listConversations(authOf(request).userId) }));

  app.post("/direct", { schema: { body: createDirectSchema } }, async (request) =>
    conversations.createDirect(authOf(request).userId, request.body.userId),
  );

  app.post("/group", { schema: { body: createGroupSchema } }, async (request, reply) =>
    reply.status(201).send(await conversations.createGroup(authOf(request).userId, request.body)),
  );

  app.get("/:id", { schema: { params: idParamsSchema } }, async (request) =>
    conversations.getConversation(authOf(request).userId, request.params.id),
  );

  app.patch("/:id", { schema: { params: idParamsSchema, body: updateConversationSchema } }, async (request) =>
    conversations.updateConversation(authOf(request).userId, request.params.id, request.body),
  );

  app.put("/:id/avatar", { schema: { params: idParamsSchema } }, async (request) =>
    conversations.setGroupAvatar(authOf(request).userId, request.params.id, await request.file()),
  );

  app.delete(
    "/:id",
    {
      schema: {
        params: idParamsSchema,
        querystring: z.object({ scope: z.enum(["me", "everyone"]).default("me") }),
      },
    },
    async (request, reply) => {
      const { userId } = authOf(request);
      if (request.query.scope === "everyone") await conversations.deleteGroup(userId, request.params.id);
      else await conversations.clearForMe(userId, request.params.id);
      return reply.status(204).send();
    },
  );

  app.post("/:id/leave", { schema: { params: idParamsSchema } }, async (request, reply) => {
    await conversations.leaveConversation(authOf(request).userId, request.params.id);
    return reply.status(204).send();
  });

  app.put("/:id/mute", { schema: { params: idParamsSchema, body: muteSchema } }, async (request, reply) => {
    const until = request.body.mutedUntil ? new Date(request.body.mutedUntil) : null;
    await conversations.setMuted(authOf(request).userId, request.params.id, until);
    return reply.status(204).send();
  });

  app.post("/:id/members", { schema: { params: idParamsSchema, body: addMembersSchema } }, async (request) =>
    conversations.addMembers(authOf(request).userId, request.params.id, request.body.userIds),
  );

  app.delete("/:id/members/:userId", { schema: { params: memberParamsSchema } }, async (request) =>
    conversations.removeMember(authOf(request).userId, request.params.id, request.params.userId),
  );

  app.patch(
    "/:id/members/:userId",
    { schema: { params: memberParamsSchema, body: updateMemberRoleSchema } },
    async (request) =>
      conversations.updateMemberRole(
        authOf(request).userId,
        request.params.id,
        request.params.userId,
        request.body.role,
      ),
  );

  app.post("/:id/invite", { schema: { params: idParamsSchema } }, async (request) => ({
    inviteCode: await conversations.regenerateInvite(authOf(request).userId, request.params.id),
  }));

  app.delete("/:id/invite", { schema: { params: idParamsSchema } }, async (request, reply) => {
    await conversations.regenerateInvite(authOf(request).userId, request.params.id, true);
    return reply.status(204).send();
  });

  app.post(
    "/:id/read",
    { schema: { params: idParamsSchema, body: markReadSchema } },
    async (request, reply) => {
      await conversations.markRead(authOf(request).userId, request.params.id, request.body.messageId);
      return reply.status(204).send();
    },
  );

  app.get(
    "/:id/messages",
    { schema: { params: idParamsSchema, querystring: listMessagesQuerySchema } },
    async (request) => listMessages(authOf(request).userId, request.params.id, request.query),
  );

  app.get(
    "/:id/media",
    { schema: { params: idParamsSchema, querystring: sharedMediaQuerySchema } },
    async (request) =>
      sharedMedia(
        authOf(request).userId,
        request.params.id,
        request.query.kind,
        request.query.before,
        request.query.limit,
      ),
  );
};

export const inviteRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", requireAuth);

  app.get("/:code", { schema: { params: inviteCodeParamsSchema } }, async (request) =>
    conversations.previewInvite(authOf(request).userId, request.params.code),
  );

  app.post(
    "/:code/join",
    {
      schema: { params: inviteCodeParamsSchema },
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request) => conversations.joinByInvite(authOf(request).userId, request.params.code),
  );
};
