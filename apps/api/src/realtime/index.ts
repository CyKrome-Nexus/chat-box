import type { Server as HttpServer } from "node:http";

import { createAdapter } from "@socket.io/redis-adapter";
import { Server, type Socket } from "socket.io";
import { z, ZodError, type ZodType } from "zod";

import {
  callTypeSchema,
  objectIdSchema,
  sendMessageSchema,
  type Ack,
  type ClientToServerEvents,
  type Message,
  type ServerToClientEvents,
} from "@chatbox/shared";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors";
import { createRedisConnection } from "@/lib/redis";
import { verifyAccessToken } from "@/lib/tokens";
import { buildViewerContext, canSee } from "@/lib/viewer";
import { Session } from "@/models/session";
import { User } from "@/models/user";
import * as calls from "@/modules/calls/calls.service";
import {
  markDelivered,
  markRead,
  sharedConversationPeers,
} from "@/modules/conversations/conversations.service";
import { membersOf } from "@/modules/conversations/membership-cache";
import { sendMessage } from "@/modules/messages/messages.service";
import { hub, sessionRoom, userRoom, type IoServer, type SocketData } from "./hub";
import { presence } from "./presence";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const receiptSchema = z.object({ conversationId: objectIdSchema, messageId: objectIdSchema });
const typingSchema = z.object({ conversationId: objectIdSchema, isTyping: z.boolean() });
const callIdSchema = z.object({ callId: z.string().min(10).max(40) });
const signalSchema = z.object({
  callId: z.string().min(10).max(40),
  toUserId: objectIdSchema,
  sdp: z.string().max(20_000).optional(),
  sdpType: z.enum(["offer", "answer"]).optional(),
  candidate: z
    .object({
      candidate: z.string().max(2000),
      sdpMLineIndex: z.number().int().nullable(),
      sdpMid: z.string().max(64).nullable(),
    })
    .optional(),
});

const toAckError = (error: unknown) => {
  if (error instanceof AppError) return { code: error.code, message: error.message };
  if (error instanceof ZodError)
    return { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Invalid payload" };
  return { code: "INTERNAL", message: "Something went wrong" };
};

// Token bucket per socket so a single client can't flood the gateway.
const createLimiter = (capacity: number, refillPerSecond: number) => {
  let tokens = capacity;
  let updated = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(capacity, tokens + ((now - updated) / 1000) * refillPerSecond);
    updated = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
};

const broadcastPresence = async (userId: string, online: boolean) => {
  const user = await User.findById(userId, { privacy: 1, lastSeenAt: 1 }).lean();
  if (!user || user.privacy?.lastSeen === "nobody") return;
  const peers = await sharedConversationPeers(userId);
  const lastSeenAt = online ? null : (user.lastSeenAt?.toISOString() ?? null);
  if (user.privacy?.lastSeen === "contacts") {
    const visible = await Promise.all(
      peers.map(async (peerId) =>
        canSee("contacts", userId, await buildViewerContext(peerId, [userId])) ? peerId : null,
      ),
    );
    hub.toUsers(
      visible.filter((id): id is string => id !== null),
      "presence:update",
      { userId, online, lastSeenAt },
    );
    return;
  }
  hub.toUsers(peers, "presence:update", { userId, online, lastSeenAt });
};

// Fire-and-forget events: invalid payloads and failures are dropped silently.
const handle =
  <T>(schema: ZodType<T>, run: (payload: T) => Promise<void>) =>
  (raw: unknown) => {
    const parsed = schema.safeParse(raw);
    if (parsed.success) run(parsed.data).catch(() => undefined);
  };

const registerHandlers = (socket: AppSocket) => {
  const { userId } = socket.data;
  const allowSend = createLimiter(30, 10);
  const allowEvent = createLimiter(60, 30);

  socket.on("message:send", (payload, ack: Ack<Message>) => {
    const reply = typeof ack === "function" ? ack : () => undefined;
    if (!allowSend()) return reply({ ok: false, error: { code: "RATE_LIMITED", message: "Slow down" } });
    const parsed = sendMessageSchema.safeParse(payload);
    if (!parsed.success) return reply({ ok: false, error: toAckError(parsed.error) });
    sendMessage(userId, parsed.data)
      .then((message) => reply({ ok: true, data: message }))
      .catch((error: unknown) => reply({ ok: false, error: toAckError(error) }));
  });

  socket.on(
    "message:read",
    handle(receiptSchema, ({ conversationId, messageId }) => markRead(userId, conversationId, messageId)),
  );
  socket.on(
    "message:delivered",
    handle(receiptSchema, ({ conversationId, messageId }) =>
      markDelivered(userId, conversationId, messageId),
    ),
  );

  socket.on(
    "typing:update",
    handle(typingSchema, async ({ conversationId, isTyping }) => {
      if (!allowEvent()) return;
      const members = await membersOf(conversationId);
      if (!members.has(userId)) return;
      hub.toUsers(
        [...members].filter((id) => id !== userId),
        "typing:update",
        { conversationId, userId, isTyping },
      );
    }),
  );

  socket.on("presence:subscribe", (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => undefined;
    const parsed = z.object({ userIds: z.array(objectIdSchema).max(500) }).safeParse(payload);
    if (!parsed.success) return reply({ ok: false, error: toAckError(parsed.error) });
    void (async () => {
      const ids = parsed.data.userIds;
      const [context, users] = await Promise.all([
        buildViewerContext(userId, ids),
        User.find({ _id: { $in: ids } }, { privacy: 1, lastSeenAt: 1 }).lean(),
      ]);
      reply({
        ok: true,
        data: users
          .filter((user) => canSee(user.privacy?.lastSeen, user._id.toString(), context))
          .map((user) => ({
            userId: user._id.toString(),
            online: context.online.has(user._id.toString()),
            lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
          })),
      });
    })().catch((error: unknown) => reply({ ok: false, error: toAckError(error) }));
  });

  socket.on("call:invite", (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => undefined;
    const parsed = z.object({ conversationId: objectIdSchema, type: callTypeSchema }).safeParse(payload);
    if (!parsed.success) return reply({ ok: false, error: toAckError(parsed.error) });
    calls
      .inviteCall(userId, parsed.data.conversationId, parsed.data.type)
      .then((data) => reply({ ok: true, data }))
      .catch((error: unknown) => reply({ ok: false, error: toAckError(error) }));
  });

  socket.on(
    "call:signal",
    handle(signalSchema, async (payload) => {
      if (allowEvent()) await calls.relaySignal(userId, payload);
    }),
  );
  socket.on(
    "call:accept",
    handle(callIdSchema, ({ callId }) => calls.acceptCall(userId, callId)),
  );
  socket.on(
    "call:decline",
    handle(callIdSchema.extend({ busy: z.boolean().optional() }), ({ callId, busy }) =>
      calls.declineCall(userId, callId, busy),
    ),
  );
  socket.on(
    "call:end",
    handle(callIdSchema, ({ callId }) => calls.endCall(userId, callId)),
  );
  socket.on(
    "call:media",
    handle(
      callIdSchema.extend({ audioMuted: z.boolean(), videoEnabled: z.boolean() }),
      ({ callId, audioMuted, videoEnabled }) => calls.relayMedia(userId, callId, audioMuted, videoEnabled),
    ),
  );
};

export const createRealtime = (httpServer: HttpServer, corsOrigins: string[]): IoServer => {
  const io: IoServer = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: corsOrigins, credentials: true },
    maxHttpBufferSize: 256 * 1024,
    pingInterval: 25_000,
    pingTimeout: 20_000,
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000, skipMiddlewares: false },
  });

  const pub = createRedisConnection();
  const sub = createRedisConnection();
  if (pub && sub) io.adapter(createAdapter(pub, sub));

  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
    if (typeof token !== "string") return next(new Error("UNAUTHORIZED"));
    void (async () => {
      const claims = await verifyAccessToken(token);
      const [session, user] = await Promise.all([
        Session.findById(claims.sessionId, { revokedAt: 1, expiresAt: 1 }).lean(),
        User.findById(claims.userId, { name: 1, disabledAt: 1 }).lean(),
      ]);
      if (!session || session.revokedAt || !user || user.disabledAt) throw new Error("UNAUTHORIZED");
      socket.data = { userId: claims.userId, sessionId: claims.sessionId, name: user.name };
      next();
    })().catch(() => next(new Error("UNAUTHORIZED")));
  });

  io.on("connection", (socket) => {
    const { userId, sessionId } = socket.data;
    void socket.join([userRoom(userId), sessionRoom(sessionId)]);
    registerHandlers(socket);

    void presence.connect(userId).then((cameOnline) => {
      if (cameOnline) void broadcastPresence(userId, true).catch(() => undefined);
    });

    socket.on("disconnect", () => {
      void presence
        .disconnect(userId)
        .then(async (wentOffline) => {
          if (!wentOffline) return;
          await User.updateOne({ _id: userId }, { $set: { lastSeenAt: new Date() } });
          await broadcastPresence(userId, false);
        })
        .catch(() => undefined);
    });
  });

  hub.attach(io);
  presence.start();
  return io;
};

export const corsOriginsFrom = (origins: string[]): string[] =>
  origins.length
    ? origins
    : env.NODE_ENV === "production"
      ? []
      : ["http://localhost:5173", "http://localhost:8081"];
