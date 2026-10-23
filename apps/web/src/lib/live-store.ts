import { useSyncExternalStore } from "react";

import type { PresencePayload } from "@chatbox/shared";

// Ephemeral realtime state (presence + typing) kept outside React Query.
type Listener = () => void;

const presence = new Map<string, PresencePayload>();
const typing = new Map<string, Map<string, number>>();
const listeners = new Set<Listener>();
let version = 0;

const emit = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const liveStore = {
  setPresence(payload: PresencePayload) {
    presence.set(payload.userId, payload);
    emit();
  },
  setTyping(conversationId: string, userId: string, isTyping: boolean) {
    const users = typing.get(conversationId) ?? new Map<string, number>();
    if (isTyping) users.set(userId, Date.now());
    else users.delete(userId);
    typing.set(conversationId, users);
    emit();
  },
  clearTyping(conversationId: string, userId: string) {
    if (typing.get(conversationId)?.delete(userId)) emit();
  },
};

const TYPING_TTL_MS = 6000;

export const usePresence = (userId: string | null | undefined): PresencePayload | null =>
  useSyncExternalStore(subscribe, () => (userId ? (presence.get(userId) ?? null) : null));

export const useTypingUsers = (conversationId: string | null | undefined): string[] => {
  useSyncExternalStore(subscribe, () => version);
  if (!conversationId) return [];
  const now = Date.now();
  return [...(typing.get(conversationId) ?? new Map<string, number>())]
    .filter(([, at]) => now - at < TYPING_TTL_MS)
    .map(([userId]) => userId);
};
