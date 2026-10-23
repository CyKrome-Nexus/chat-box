import { Conversation } from "@/models/conversation";

const TTL_MS = 30_000;
const MAX_ENTRIES = 10_000;

const cache = new Map<string, { members: Set<string>; expiresAt: number }>();

// Short-lived member lists for hot realtime paths (typing, call signalling).
export const membersOf = async (conversationId: string): Promise<Set<string>> => {
  const hit = cache.get(conversationId);
  if (hit && hit.expiresAt > Date.now()) return hit.members;

  const conversation = await Conversation.findById(conversationId, { "members.userId": 1 }).lean();
  const members = new Set((conversation?.members ?? []).map((member) => member.userId.toString()));
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(conversationId, { members, expiresAt: Date.now() + TTL_MS });
  return members;
};

export const invalidateMembers = (conversationId: string): void => {
  cache.delete(conversationId);
};
