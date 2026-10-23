import { nanoid } from "nanoid";

import type { CallLog, CallSignalPayload, CallType, IceConfig } from "@chatbox/shared";

import { env } from "@/config/env";
import { hmacSha1Base64 } from "@/lib/crypto";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { sendPush } from "@/lib/push";
import { buildViewerContext, loadUsers, toObjectId } from "@/lib/viewer";
import { Call, type CallDoc } from "@/models/misc";
import { User } from "@/models/user";
import { hub } from "@/realtime/hub";
import { presence } from "@/realtime/presence";
import { toUserSummary } from "@/serializers/users";
import { loadForMember } from "@/modules/conversations/conversations.service";

const RING_TIMEOUT_MS = 45_000;
const PARTICIPANT_CACHE_MS = 2 * 60 * 60 * 1000;

const ringTimers = new Map<string, NodeJS.Timeout>();
const participantCache = new Map<string, { ids: Set<string>; expiresAt: number }>();

const participantsOf = async (callId: string): Promise<{ call: CallDoc; ids: Set<string> } | null> => {
  const call = await Call.findOne({ callId }).lean<CallDoc>();
  if (!call) return null;
  const ids = new Set(call.participantIds.map(String));
  participantCache.set(callId, { ids, expiresAt: Date.now() + PARTICIPANT_CACHE_MS });
  return { call, ids };
};

const cachedParticipants = async (callId: string): Promise<Set<string> | null> => {
  const hit = participantCache.get(callId);
  if (hit && hit.expiresAt > Date.now()) return hit.ids;
  return (await participantsOf(callId))?.ids ?? null;
};

const clearRing = (callId: string) => {
  const timer = ringTimers.get(callId);
  if (timer) clearTimeout(timer);
  ringTimers.delete(callId);
};

const finish = async (callId: string, status: CallDoc["status"]) => {
  clearRing(callId);
  const call = await Call.findOneAndUpdate(
    { callId, status: { $in: ["ringing", "ongoing"] } },
    { $set: { status, endedAt: new Date() } },
    { new: true },
  ).lean<CallDoc>();
  participantCache.delete(callId);
  return call;
};

export const inviteCall = async (userId: string, conversationId: string, type: CallType) => {
  const { conversation } = await loadForMember(conversationId, userId);
  const participantIds = conversation.members.map((member) => member.userId.toString());
  const others = participantIds.filter((id) => id !== userId);
  if (others.length === 0) throw badRequest("There's no one to call");

  if (conversation.type === "direct") {
    const blocked = await User.exists({
      $or: [
        { _id: toObjectId(userId), blockedUserIds: toObjectId(others[0] ?? "") },
        { _id: toObjectId(others[0] ?? ""), blockedUserIds: toObjectId(userId) },
      ],
    });
    if (blocked) throw forbidden("You can't call this user");
  }

  const callId = nanoid(21);
  await Call.create({
    callId,
    conversationId: conversation._id,
    type,
    initiatorId: toObjectId(userId),
    participantIds: participantIds.map(toObjectId),
    joinedIds: [toObjectId(userId)],
    status: "ringing",
    startedAt: new Date(),
  });
  participantCache.set(callId, {
    ids: new Set(participantIds),
    expiresAt: Date.now() + PARTICIPANT_CACHE_MS,
  });

  const caller = await User.findById(userId, { name: 1, avatar: 1 }).lean();
  const name =
    conversation.type === "group" ? (conversation.name ?? "Group call") : (caller?.name ?? "Unknown");
  const from = {
    id: userId,
    name,
    avatarUrl:
      conversation.type === "group" ? (conversation.avatar?.url ?? null) : (caller?.avatar?.url ?? null),
  };
  hub.toUsers(others, "call:incoming", { callId, conversationId, type, from, participantIds });

  const offline = (
    await Promise.all(others.map(async (id) => ((await presence.isOnline(id)) ? null : id)))
  ).filter((id): id is string => id !== null);
  void sendPush(offline, {
    title: name,
    body: type === "video" ? "Incoming video call" : "Incoming voice call",
    data: { type: "call", callId, conversationId, callType: type, callerName: name },
    category: "call",
    priority: "high",
    ttlSeconds: 45,
  }).catch(() => undefined);

  const timer = setTimeout(() => {
    void (async () => {
      const call = await finish(callId, "missed");
      if (call)
        hub.toUsers(participantIds, "call:state", { callId, conversationId, userId, state: "missed" });
    })();
  }, RING_TIMEOUT_MS);
  timer.unref();
  ringTimers.set(callId, timer);

  return { callId, participantIds };
};

export const relaySignal = async (
  userId: string,
  payload: Omit<CallSignalPayload, "fromUserId">,
): Promise<void> => {
  const ids = await cachedParticipants(payload.callId);
  if (!ids?.has(userId) || !ids.has(payload.toUserId)) return;
  hub.toUsers([payload.toUserId], "call:signal", { ...payload, fromUserId: userId });
};

export const acceptCall = async (userId: string, callId: string): Promise<void> => {
  const found = await participantsOf(callId);
  if (!found?.ids.has(userId)) throw notFound("Call");
  clearRing(callId);
  await Call.updateOne(
    { callId, status: { $in: ["ringing", "ongoing"] } },
    {
      $set: { status: "ongoing" },
      $min: { answeredAt: new Date() },
      $addToSet: { joinedIds: toObjectId(userId) },
    },
  );
  hub.toUsers(found.ids, "call:state", {
    callId,
    conversationId: found.call.conversationId.toString(),
    userId,
    state: "accepted",
  });
};

export const declineCall = async (userId: string, callId: string, busy = false): Promise<void> => {
  const found = await participantsOf(callId);
  if (!found?.ids.has(userId)) return;
  const conversationId = found.call.conversationId.toString();
  // A 1:1 call ends when the callee declines; group calls keep ringing the others.
  if (found.ids.size === 2 && found.call.status === "ringing") await finish(callId, "declined");
  hub.toUsers(found.ids, "call:state", { callId, conversationId, userId, state: busy ? "busy" : "declined" });
};

export const endCall = async (userId: string, callId: string): Promise<void> => {
  const found = await participantsOf(callId);
  if (!found?.ids.has(userId)) return;
  const { call, ids } = found;
  const conversationId = call.conversationId.toString();

  const remaining = call.joinedIds.map(String).filter((id) => id !== userId);
  await Call.updateOne({ callId }, { $pull: { joinedIds: toObjectId(userId) } });
  if (ids.size === 2 || remaining.length <= 1 || call.status === "ringing") {
    await finish(callId, call.answeredAt ? "completed" : "cancelled");
  }
  hub.toUsers(ids, "call:state", { callId, conversationId, userId, state: "ended" });
};

export const relayMedia = async (
  userId: string,
  callId: string,
  audioMuted: boolean,
  videoEnabled: boolean,
) => {
  const ids = await cachedParticipants(callId);
  if (!ids?.has(userId)) return;
  hub.toUsers(
    [...ids].filter((id) => id !== userId),
    "call:media",
    { callId, userId, audioMuted, videoEnabled },
  );
};

export const callHistory = async (userId: string, limit = 100): Promise<CallLog[]> => {
  const calls = await Call.find({ participantIds: toObjectId(userId), status: { $ne: "ringing" } })
    .sort({ startedAt: -1 })
    .limit(limit)
    .lean<CallDoc[]>();
  const ids = calls.flatMap((call) => call.participantIds);
  const [users, context] = await Promise.all([loadUsers(ids), buildViewerContext(userId, ids)]);

  return calls.map((call) => {
    const outgoing = call.initiatorId.toString() === userId;
    const joined =
      call.joinedIds.some((id) => id.toString() === userId) ||
      Boolean(call.answeredAt && !outgoing && call.status === "completed");
    const status =
      !outgoing && !joined && ["completed", "cancelled", "missed"].includes(call.status)
        ? "missed"
        : call.status;
    const durationSeconds =
      call.answeredAt && call.endedAt
        ? Math.round((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000)
        : 0;
    return {
      id: call._id.toString(),
      conversationId: call.conversationId.toString(),
      type: call.type,
      status,
      direction: outgoing ? "outgoing" : "incoming",
      initiator: toUserSummary(users.get(call.initiatorId.toString()), context),
      participants: call.participantIds
        .filter((id) => id.toString() !== userId)
        .map((id) => toUserSummary(users.get(id.toString()), context)),
      startedAt: call.startedAt.toISOString(),
      answeredAt: call.answeredAt?.toISOString() ?? null,
      endedAt: call.endedAt?.toISOString() ?? null,
      durationSeconds,
    } satisfies CallLog;
  });
};

// RFC-style TURN REST credentials (coturn `use-auth-secret`).
export const iceConfig = (userId: string): IceConfig => {
  const iceServers: IceConfig["iceServers"] = [];
  if (env.STUN_URLS.length) iceServers.push({ urls: env.STUN_URLS });
  if (env.TURN_URLS.length && env.TURN_SECRET) {
    const username = `${Math.floor(Date.now() / 1000) + env.TURN_TTL_SECONDS}:${userId}`;
    iceServers.push({ urls: env.TURN_URLS, username, credential: hmacSha1Base64(env.TURN_SECRET, username) });
  }
  return { iceServers, ttlSeconds: env.TURN_TTL_SECONDS };
};
