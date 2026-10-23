import type { Conversation } from "@chatbox/shared";

import type { LeanUser, ViewerContext } from "@/lib/viewer";
import type { ConversationDoc } from "@/models/conversation";
import { toMessagePreview } from "./messages";
import { toUserSummary } from "./users";

const isAdminRole = (role: string | undefined) => role === "owner" || role === "admin";

export const toConversation = (
  conversation: ConversationDoc,
  viewerId: string,
  users: Map<string, LeanUser>,
  context: ViewerContext | null,
): Conversation => {
  const me = conversation.members.find((member) => member.userId.toString() === viewerId);
  const showLast =
    conversation.lastMessage && (!me?.clearedAt || conversation.lastMessage.createdAt > me.clearedAt);
  return {
    id: conversation._id.toString(),
    type: conversation.type,
    name: conversation.name ?? null,
    description: conversation.description ?? null,
    avatarUrl: conversation.avatar?.url ?? null,
    tags: conversation.tags ?? [],
    members: conversation.members.map((member) => {
      const readReceipts = users.get(member.userId.toString())?.privacy?.readReceipts ?? true;
      return {
        user: toUserSummary(users.get(member.userId.toString()), context),
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
        lastReadMessageId: readReceipts ? (member.lastReadMessageId?.toString() ?? null) : null,
        lastReadAt: readReceipts ? (member.lastReadAt?.toISOString() ?? null) : null,
        lastDeliveredAt: member.lastDeliveredAt?.toISOString() ?? null,
      };
    }),
    settings: {
      onlyAdminsCanSend: conversation.settings?.onlyAdminsCanSend ?? false,
      onlyAdminsCanEditInfo: conversation.settings?.onlyAdminsCanEditInfo ?? true,
      onlyAdminsCanAddMembers: conversation.settings?.onlyAdminsCanAddMembers ?? true,
    },
    inviteCode: isAdminRole(me?.role) ? (conversation.inviteCode ?? null) : null,
    disappearingSeconds: conversation.disappearingSeconds ?? null,
    lastMessage: showLast && conversation.lastMessage ? toMessagePreview(conversation.lastMessage) : null,
    unreadCount: me?.unreadCount ?? 0,
    mutedUntil: me?.mutedUntil?.toISOString() ?? null,
    createdById: conversation.createdBy?.toString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
};
