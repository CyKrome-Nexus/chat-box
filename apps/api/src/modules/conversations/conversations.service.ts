import type { MultipartFile } from "@fastify/multipart";
import { nanoid } from "nanoid";

import {
  LIMITS,
  type Conversation as ConversationDto,
  type CreateGroupInput,
  type InvitePreview,
  type MemberRole,
  type UpdateConversationInput,
} from "@chatbox/shared";

import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { buildViewerContext, loadUsers, toObjectId } from "@/lib/viewer";
import { Conversation, directKeyFor, type ConversationDoc, type MemberDoc } from "@/models/conversation";
import { Message } from "@/models/message";
import { User } from "@/models/user";
import { hub } from "@/realtime/hub";
import { toConversation } from "@/serializers/conversations";
import { removeStoredFile, uploadImage } from "@/modules/media/media.service";
import { invalidateMembers } from "./membership-cache";
import { postSystemMessage } from "@/modules/messages/messages.service";

export const memberOf = (conversation: ConversationDoc, userId: string): MemberDoc | undefined =>
  conversation.members.find((member) => member.userId.toString() === userId);

export const isAdmin = (member: MemberDoc | undefined): boolean =>
  member?.role === "owner" || member?.role === "admin";

export const loadForMember = async (conversationId: string, userId: string) => {
  const conversation = await Conversation.findById(conversationId);
  const member = conversation ? memberOf(conversation, userId) : undefined;
  if (!conversation || !member) throw notFound("Conversation");
  return { conversation, member };
};

export const serializeFor = async (
  viewerId: string,
  conversations: ConversationDoc[],
): Promise<ConversationDto[]> => {
  const memberIds = conversations.flatMap((conversation) =>
    conversation.members.map((member) => member.userId),
  );
  const [users, context] = await Promise.all([loadUsers(memberIds), buildViewerContext(viewerId, memberIds)]);
  return conversations.map((conversation) => toConversation(conversation, viewerId, users, context));
};

export const serializeOne = async (
  viewerId: string,
  conversation: ConversationDoc,
): Promise<ConversationDto> => {
  const [dto] = await serializeFor(viewerId, [conversation]);
  if (!dto) throw notFound("Conversation");
  return dto;
};

// Each member receives their own projection (privacy, unread count, invite visibility).
export const broadcastConversation = async (
  conversation: ConversationDoc,
  onlyUserIds?: string[],
): Promise<void> => {
  const targets = conversation.members
    .filter((member) => !member.hidden)
    .map((member) => member.userId.toString())
    .filter((id) => !onlyUserIds || onlyUserIds.includes(id));
  await Promise.all(
    targets.map(async (userId) =>
      hub.toUsers([userId], "conversation:upsert", await serializeOne(userId, conversation)),
    ),
  );
};

const notifyRemoved = (conversationId: string, userIds: string[]) =>
  hub.toUsers(userIds, "conversation:removed", { conversationId });

const ensureNotBlocked = async (a: string, b: string) => {
  const blocked = await User.exists({
    $or: [
      { _id: toObjectId(a), blockedUserIds: toObjectId(b) },
      { _id: toObjectId(b), blockedUserIds: toObjectId(a) },
    ],
  });
  if (blocked) throw forbidden("You can't message this user");
};

export const listConversations = async (userId: string): Promise<ConversationDto[]> => {
  const conversations = await Conversation.find({
    members: { $elemMatch: { userId: toObjectId(userId), hidden: false } },
  })
    .sort({ lastActivityAt: -1 })
    .limit(1000);
  return serializeFor(userId, conversations);
};

export const getConversation = async (userId: string, conversationId: string): Promise<ConversationDto> => {
  const { conversation } = await loadForMember(conversationId, userId);
  return serializeOne(userId, conversation);
};

export const createDirect = async (userId: string, otherId: string): Promise<ConversationDto> => {
  if (userId === otherId) throw badRequest("You can't start a chat with yourself");
  const other = await User.findById(otherId, { disabledAt: 1 }).lean();
  if (!other || other.disabledAt) throw notFound("User");
  await ensureNotBlocked(userId, otherId);

  const directKey = directKeyFor(userId, otherId);
  let conversation = await Conversation.findOne({ directKey });
  if (!conversation) {
    try {
      conversation = await Conversation.create({
        type: "direct",
        directKey,
        createdBy: toObjectId(userId),
        members: [
          { userId: toObjectId(userId), role: "member", hidden: false },
          // The recipient only sees the chat once a message arrives.
          { userId: toObjectId(otherId), role: "member", hidden: true },
        ],
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      conversation = await Conversation.findOne({ directKey });
    }
  }
  if (!conversation) throw notFound("Conversation");

  const me = memberOf(conversation, userId);
  if (me?.hidden) {
    me.hidden = false;
    await conversation.save();
  }
  return serializeOne(userId, conversation);
};

const assertUsersExist = async (ids: string[]) => {
  const count = await User.countDocuments({ _id: { $in: ids.map(toObjectId) }, disabledAt: null });
  if (count !== ids.length) throw badRequest("One or more members could not be found");
};

export const createGroup = async (userId: string, input: CreateGroupInput): Promise<ConversationDto> => {
  const memberIds = [...new Set(input.memberIds)].filter((id) => id !== userId);
  if (memberIds.length === 0) throw badRequest("Add at least one member");
  await assertUsersExist(memberIds);

  const conversation = await Conversation.create({
    type: "group",
    name: input.name,
    description: input.description ?? null,
    tags: input.tags,
    createdBy: toObjectId(userId),
    settings: {
      onlyAdminsCanSend: false,
      onlyAdminsCanEditInfo: true,
      onlyAdminsCanAddMembers: true,
      ...input.settings,
    },
    members: [
      { userId: toObjectId(userId), role: "owner" },
      ...memberIds.map((id) => ({ userId: toObjectId(id), role: "member" as const })),
    ],
  });
  await postSystemMessage(conversation, userId, "created the group");
  const fresh = (await Conversation.findById(conversation._id)) ?? conversation;
  await broadcastConversation(fresh);
  return serializeOne(userId, fresh);
};

const assertGroup = (conversation: ConversationDoc) => {
  if (conversation.type !== "group") throw badRequest("This only works for groups");
};

export const updateConversation = async (
  userId: string,
  conversationId: string,
  input: UpdateConversationInput,
): Promise<ConversationDto> => {
  const { conversation, member } = await loadForMember(conversationId, userId);
  const editsInfo = input.name !== undefined || input.description !== undefined || input.tags !== undefined;

  if (editsInfo || input.settings) assertGroup(conversation);
  if (input.settings && !isAdmin(member)) throw forbidden("Only admins can change group settings");
  if (editsInfo && conversation.settings.onlyAdminsCanEditInfo && !isAdmin(member)) {
    throw forbidden("Only admins can edit group info");
  }
  if (
    input.disappearingSeconds !== undefined &&
    conversation.type === "group" &&
    conversation.settings.onlyAdminsCanEditInfo &&
    !isAdmin(member)
  ) {
    throw forbidden("Only admins can change disappearing messages");
  }

  if (input.name !== undefined && input.name !== conversation.name) {
    conversation.name = input.name;
    await postSystemMessage(conversation, userId, `renamed the group to "${input.name}"`);
  }
  if (input.description !== undefined) conversation.description = input.description;
  if (input.tags !== undefined) conversation.tags = input.tags;
  if (input.settings) conversation.settings = { ...conversation.settings, ...input.settings };
  if (
    input.disappearingSeconds !== undefined &&
    input.disappearingSeconds !== conversation.disappearingSeconds
  ) {
    conversation.disappearingSeconds = input.disappearingSeconds || null;
    await postSystemMessage(
      conversation,
      userId,
      conversation.disappearingSeconds
        ? "turned on disappearing messages"
        : "turned off disappearing messages",
    );
  }

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        name: conversation.name,
        description: conversation.description,
        tags: conversation.tags,
        settings: conversation.settings,
        disappearingSeconds: conversation.disappearingSeconds ?? null,
      },
    },
  );
  const fresh = (await Conversation.findById(conversation._id)) ?? conversation;
  await broadcastConversation(fresh);
  return serializeOne(userId, fresh);
};

export const setGroupAvatar = async (
  userId: string,
  conversationId: string,
  file: MultipartFile | undefined,
) => {
  const { conversation, member } = await loadForMember(conversationId, userId);
  assertGroup(conversation);
  if (conversation.settings.onlyAdminsCanEditInfo && !isAdmin(member))
    throw forbidden("Only admins can edit group info");
  const image = await uploadImage(userId, file);
  const previous = conversation.avatar?.key;
  conversation.avatar = image;
  await conversation.save();
  if (previous) await removeStoredFile(previous);
  await broadcastConversation(conversation);
  return serializeOne(userId, conversation);
};

export const addMembers = async (
  userId: string,
  conversationId: string,
  userIds: string[],
): Promise<ConversationDto> => {
  const { conversation, member } = await loadForMember(conversationId, userId);
  assertGroup(conversation);
  if (conversation.settings.onlyAdminsCanAddMembers && !isAdmin(member))
    throw forbidden("Only admins can add members");

  const existing = new Set(conversation.members.map((item) => item.userId.toString()));
  const newIds = [...new Set(userIds)].filter((id) => !existing.has(id));
  if (newIds.length === 0) return serializeOne(userId, conversation);
  if (existing.size + newIds.length > LIMITS.groupMembersMax) throw badRequest("This group is full");
  await assertUsersExist(newIds);

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $push: {
        members: {
          $each: newIds.map((id) => ({ userId: toObjectId(id), role: "member", joinedAt: new Date() })),
        },
      },
    },
  );
  invalidateMembers(conversationId);
  const names = [...(await loadUsers(newIds)).values()].map((user) => user.name).join(", ");
  const fresh = await Conversation.findById(conversation._id);
  if (!fresh) throw notFound("Conversation");
  await postSystemMessage(fresh, userId, `added ${names}`);
  await broadcastConversation((await Conversation.findById(conversation._id)) ?? fresh);
  return serializeOne(userId, fresh);
};

const pickNextOwner = (members: MemberDoc[]): MemberDoc | undefined =>
  [...members].sort((a, b) => {
    const rank = (role: MemberRole) => (role === "admin" ? 0 : 1);
    return rank(a.role) - rank(b.role) || a.joinedAt.getTime() - b.joinedAt.getTime();
  })[0];

const removeFromGroup = async (conversation: ConversationDoc, targetId: string) => {
  const remaining = conversation.members.filter((item) => item.userId.toString() !== targetId);
  if (remaining.length === 0) {
    await Promise.all([
      Conversation.deleteOne({ _id: conversation._id }),
      Message.deleteMany({ conversationId: conversation._id }),
    ]);
    invalidateMembers(conversation._id.toString());
    return null;
  }
  const leavingOwner =
    conversation.members.find((item) => item.userId.toString() === targetId)?.role === "owner";
  const update: Record<string, unknown> = { $pull: { members: { userId: toObjectId(targetId) } } };
  await Conversation.updateOne({ _id: conversation._id }, update);
  if (leavingOwner) {
    const next = pickNextOwner(remaining);
    if (next)
      await Conversation.updateOne(
        { _id: conversation._id, "members.userId": next.userId },
        { $set: { "members.$.role": "owner" } },
      );
  }
  invalidateMembers(conversation._id.toString());
  return Conversation.findById(conversation._id);
};

export const removeMember = async (
  userId: string,
  conversationId: string,
  targetId: string,
): Promise<ConversationDto> => {
  const { conversation, member } = await loadForMember(conversationId, userId);
  assertGroup(conversation);
  if (targetId === userId) throw badRequest("Use leave to exit the group");
  const target = memberOf(conversation, targetId);
  if (!target) throw notFound("Member");
  if (!isAdmin(member)) throw forbidden("Only admins can remove members");
  if (target.role === "owner" || (target.role === "admin" && member?.role !== "owner")) {
    throw forbidden("You can't remove this admin");
  }

  const fresh = await removeFromGroup(conversation, targetId);
  if (!fresh) throw notFound("Conversation");
  const [name] = [...(await loadUsers([targetId])).values()].map((user) => user.name);
  await postSystemMessage(fresh, userId, `removed ${name ?? "a member"}`);
  notifyRemoved(conversationId, [targetId]);
  await broadcastConversation((await Conversation.findById(fresh._id)) ?? fresh);
  return serializeOne(userId, fresh);
};

export const updateMemberRole = async (
  userId: string,
  conversationId: string,
  targetId: string,
  role: "admin" | "member",
): Promise<ConversationDto> => {
  const { conversation, member } = await loadForMember(conversationId, userId);
  assertGroup(conversation);
  const target = memberOf(conversation, targetId);
  if (!target) throw notFound("Member");
  if (target.role === "owner") throw forbidden("The owner's role can't be changed");
  if (!isAdmin(member)) throw forbidden("Only admins can change roles");
  if (role === "member" && member?.role !== "owner") throw forbidden("Only the owner can remove admins");

  await Conversation.updateOne(
    { _id: conversation._id, "members.userId": target.userId },
    { $set: { "members.$.role": role } },
  );
  const fresh = await Conversation.findById(conversation._id);
  if (!fresh) throw notFound("Conversation");
  await broadcastConversation(fresh);
  return serializeOne(userId, fresh);
};

export const leaveConversation = async (userId: string, conversationId: string): Promise<void> => {
  const { conversation } = await loadForMember(conversationId, userId);
  if (conversation.type === "direct") {
    await clearForMe(userId, conversationId);
    return;
  }
  const fresh = await removeFromGroup(conversation, userId);
  notifyRemoved(conversationId, [userId]);
  if (fresh) {
    await postSystemMessage(fresh, userId, "left the group");
    await broadcastConversation((await Conversation.findById(fresh._id)) ?? fresh);
  }
};

export const clearForMe = async (userId: string, conversationId: string): Promise<void> => {
  await loadForMember(conversationId, userId);
  await Conversation.updateOne(
    { _id: toObjectId(conversationId), "members.userId": toObjectId(userId) },
    { $set: { "members.$.clearedAt": new Date(), "members.$.hidden": true, "members.$.unreadCount": 0 } },
  );
  notifyRemoved(conversationId, [userId]);
};

export const deleteGroup = async (userId: string, conversationId: string): Promise<void> => {
  const { conversation, member } = await loadForMember(conversationId, userId);
  assertGroup(conversation);
  if (member?.role !== "owner") throw forbidden("Only the owner can delete the group");
  const memberIds = conversation.members.map((item) => item.userId.toString());
  await Promise.all([
    Conversation.deleteOne({ _id: conversation._id }),
    Message.deleteMany({ conversationId: conversation._id }),
  ]);
  invalidateMembers(conversationId);
  notifyRemoved(conversationId, memberIds);
};

export const setMuted = async (
  userId: string,
  conversationId: string,
  mutedUntil: Date | null,
): Promise<void> => {
  await loadForMember(conversationId, userId);
  await Conversation.updateOne(
    { _id: toObjectId(conversationId), "members.userId": toObjectId(userId) },
    { $set: { "members.$.mutedUntil": mutedUntil } },
  );
};

export const regenerateInvite = async (
  userId: string,
  conversationId: string,
  revoke = false,
): Promise<string | null> => {
  const { conversation, member } = await loadForMember(conversationId, userId);
  assertGroup(conversation);
  if (!isAdmin(member)) throw forbidden("Only admins can manage invite links");
  const code = revoke ? null : nanoid(16);
  await Conversation.updateOne({ _id: conversation._id }, { $set: { inviteCode: code } });
  return code;
};

export const previewInvite = async (userId: string, code: string): Promise<InvitePreview> => {
  const conversation = await Conversation.findOne({ inviteCode: code }).lean<ConversationDoc>();
  if (!conversation) throw notFound("Invite");
  return {
    conversationId: conversation._id.toString(),
    name: conversation.name ?? "Group",
    description: conversation.description ?? null,
    avatarUrl: conversation.avatar?.url ?? null,
    memberCount: conversation.members.length,
    alreadyMember: conversation.members.some((member) => member.userId.toString() === userId),
  };
};

export const joinByInvite = async (userId: string, code: string): Promise<ConversationDto> => {
  const conversation = await Conversation.findOne({ inviteCode: code });
  if (!conversation) throw notFound("Invite");
  if (memberOf(conversation, userId)) return serializeOne(userId, conversation);
  if (conversation.members.length >= LIMITS.groupMembersMax)
    throw conflict("This group is full", "GROUP_FULL");

  await Conversation.updateOne(
    { _id: conversation._id, "members.userId": { $ne: toObjectId(userId) } },
    { $push: { members: { userId: toObjectId(userId), role: "member", joinedAt: new Date() } } },
  );
  invalidateMembers(conversation._id.toString());
  const fresh = await Conversation.findById(conversation._id);
  if (!fresh) throw notFound("Conversation");
  await postSystemMessage(fresh, userId, "joined using an invite link");
  await broadcastConversation((await Conversation.findById(fresh._id)) ?? fresh);
  return serializeOne(userId, fresh);
};

const advancePointer = async (
  userId: string,
  conversationId: string,
  messageId: string,
  kind: "read" | "delivered",
): Promise<void> => {
  const message = await Message.findOne(
    { _id: toObjectId(messageId), conversationId: toObjectId(conversationId) },
    { createdAt: 1 },
  ).lean();
  if (!message) return;
  const field = kind === "read" ? "lastReadAt" : "lastDeliveredAt";
  const set: Record<string, unknown> = { [`members.$.${field}`]: message.createdAt };
  if (kind === "read") {
    set["members.$.lastReadMessageId"] = message._id;
    set["members.$.unreadCount"] = 0;
  }
  const result = await Conversation.updateOne(
    {
      _id: toObjectId(conversationId),
      members: {
        $elemMatch: {
          userId: toObjectId(userId),
          $or: [{ [field]: null }, { [field]: { $lt: message.createdAt } }],
        },
      },
    },
    { $set: set },
  );
  if (kind === "read" && result.modifiedCount === 0) {
    await Conversation.updateOne(
      { _id: toObjectId(conversationId), "members.userId": toObjectId(userId) },
      { $set: { "members.$.unreadCount": 0 } },
    );
  }
  if (result.modifiedCount === 0) return;

  const conversation = await Conversation.findById(conversationId, { "members.userId": 1 }).lean();
  const user = await User.findById(userId, { "privacy.readReceipts": 1 }).lean();
  if (kind === "read" && user?.privacy?.readReceipts === false) return;
  const others = (conversation?.members ?? [])
    .map((member) => member.userId.toString())
    .filter((id) => id !== userId);
  hub.toUsers(others, "receipt:update", {
    conversationId,
    userId,
    messageId,
    status: kind,
    at: message.createdAt.toISOString(),
  });
};

export const markRead = (userId: string, conversationId: string, messageId: string) =>
  advancePointer(userId, conversationId, messageId, "read");

export const markDelivered = (userId: string, conversationId: string, messageId: string) =>
  advancePointer(userId, conversationId, messageId, "delivered");

export const sharedConversationPeers = async (userId: string): Promise<string[]> => {
  const conversations = await Conversation.find(
    { "members.userId": toObjectId(userId) },
    { "members.userId": 1 },
  )
    .limit(2000)
    .lean();
  const peers = new Set<string>();
  for (const conversation of conversations) {
    for (const member of conversation.members) peers.add(member.userId.toString());
  }
  peers.delete(userId);
  return [...peers];
};
