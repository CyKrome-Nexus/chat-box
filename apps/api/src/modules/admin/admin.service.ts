import type {
  AdminConversation,
  AdminListQuery,
  AdminMessage,
  AdminPage,
  AdminStats,
  AdminUser,
} from "@chatbox/shared";

import { badRequest, notFound } from "@/lib/errors";
import { loadUsers, toObjectId } from "@/lib/viewer";
import { Conversation } from "@/models/conversation";
import { Message } from "@/models/message";
import { User } from "@/models/user";
import { hub } from "@/realtime/hub";
import { toUserSummary } from "@/serializers/users";
import { revokeAllSessions } from "@/modules/auth/auth.service";

const DAY_MS = 24 * 60 * 60 * 1000;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getStats = async (): Promise<AdminStats> => {
  const since = new Date(Date.now() - 6 * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);

  const [users, activeUsers24h, groups, directChats, messages, perDay] = await Promise.all([
    User.countDocuments({ disabledAt: null }),
    User.countDocuments({ lastSeenAt: { $gte: new Date(Date.now() - DAY_MS) } }),
    Conversation.countDocuments({ type: "group" }),
    Conversation.countDocuments({ type: "direct" }),
    Message.estimatedDocumentCount(),
    Message.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
  ]);

  const counts = new Map(perDay.map((day) => [day._id, day.count]));
  const messagesLast7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(since.getTime() + index * DAY_MS).toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });

  return { users, activeUsers24h, groups, directChats, messages, messagesLast7Days };
};

export const listUsers = async (query: AdminListQuery): Promise<AdminPage<AdminUser>> => {
  const filter = query.q
    ? {
        $or: ["name", "handle", "email", "phone"].map((field) => ({
          [field]: new RegExp(escapeRegex(query.q ?? ""), "i"),
        })),
      }
    : {};
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .lean(),
  ]);
  const ids = users.map((user) => user._id);
  const counts = await Conversation.aggregate<{ _id: { userId: unknown; type: string }; count: number }>([
    { $match: { "members.userId": { $in: ids } } },
    { $unwind: "$members" },
    { $match: { "members.userId": { $in: ids } } },
    { $group: { _id: { userId: "$members.userId", type: "$type" }, count: { $sum: 1 } } },
  ]);
  const countOf = (userId: string, type: string) =>
    counts.find((row) => String(row._id.userId) === userId && row._id.type === type)?.count ?? 0;

  return {
    total,
    page: query.page,
    pageSize: query.pageSize,
    items: users.map((user) => {
      const id = user._id.toString();
      return {
        id,
        name: user.name,
        handle: user.handle ?? null,
        avatarUrl: user.avatar?.url ?? null,
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: user.role,
        disabled: Boolean(user.disabledAt),
        groups: countOf(id, "group"),
        directChats: countOf(id, "direct"),
        createdAt: user.createdAt.toISOString(),
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      };
    }),
  };
};

export const updateUser = async (
  actorId: string,
  userId: string,
  input: { disabled?: boolean | undefined; role?: "user" | "admin" | undefined },
) => {
  if (actorId === userId) throw badRequest("You can't change your own admin account here");
  const user = await User.findById(userId);
  if (!user) throw notFound("User");
  if (input.role) user.role = input.role;
  if (input.disabled !== undefined) user.disabledAt = input.disabled ? new Date() : null;
  await user.save();
  if (input.disabled || input.role) {
    await revokeAllSessions(userId);
    hub.disconnectUser(userId);
  }
};

export const listConversations = async (query: AdminListQuery): Promise<AdminPage<AdminConversation>> => {
  const filter = query.q ? { name: new RegExp(escapeRegex(query.q), "i") } : {};
  const [total, conversations] = await Promise.all([
    Conversation.countDocuments(filter),
    Conversation.find(filter, { type: 1, name: 1, avatar: 1, members: 1, createdBy: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .lean(),
  ]);
  const ids = conversations.map((conversation) => conversation._id);
  const [messageCounts, creators] = await Promise.all([
    Message.aggregate<{ _id: unknown; count: number }>([
      { $match: { conversationId: { $in: ids } } },
      { $group: { _id: "$conversationId", count: { $sum: 1 } } },
    ]),
    loadUsers(
      conversations.flatMap((conversation) => (conversation.createdBy ? [conversation.createdBy] : [])),
    ),
  ]);

  return {
    total,
    page: query.page,
    pageSize: query.pageSize,
    items: conversations.map((conversation) => ({
      id: conversation._id.toString(),
      type: conversation.type,
      name: conversation.name ?? null,
      avatarUrl: conversation.avatar?.url ?? null,
      memberCount: conversation.members.length,
      messageCount: messageCounts.find((row) => String(row._id) === conversation._id.toString())?.count ?? 0,
      createdBy: conversation.createdBy
        ? toUserSummary(creators.get(conversation.createdBy.toString()), null)
        : null,
      createdAt: conversation.createdAt.toISOString(),
    })),
  };
};

// Message bodies are never exposed to admins — metadata only.
export const listMessages = async (
  query: AdminListQuery & { conversationId?: string | undefined },
): Promise<AdminPage<AdminMessage>> => {
  const filter = query.conversationId ? { conversationId: toObjectId(query.conversationId) } : {};
  const [total, messages] = await Promise.all([
    query.conversationId ? Message.countDocuments(filter) : Message.estimatedDocumentCount(),
    Message.find(filter, {
      conversationId: 1,
      senderId: 1,
      kind: 1,
      attachments: 1,
      deletedAt: 1,
      createdAt: 1,
    })
      .sort({ _id: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .lean(),
  ]);
  const [users, conversations] = await Promise.all([
    loadUsers(messages.flatMap((message) => (message.senderId ? [message.senderId] : []))),
    Conversation.find(
      { _id: { $in: messages.map((message) => message.conversationId) } },
      { type: 1 },
    ).lean(),
  ]);
  const typeOf = new Map(
    conversations.map((conversation) => [conversation._id.toString(), conversation.type]),
  );

  return {
    total,
    page: query.page,
    pageSize: query.pageSize,
    items: messages.map((message) => ({
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      conversationType: typeOf.get(message.conversationId.toString()) ?? "direct",
      sender: message.senderId ? toUserSummary(users.get(message.senderId.toString()), null) : null,
      kind: message.kind,
      attachmentCount: message.attachments.length,
      deleted: Boolean(message.deletedAt),
      createdAt: message.createdAt.toISOString(),
    })),
  };
};
