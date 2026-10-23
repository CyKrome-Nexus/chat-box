import { nanoid } from "nanoid";
import { Types } from "mongoose";

import {
  DELETE_FOR_EVERYONE_WINDOW_MS,
  EDIT_WINDOW_MS,
  previewText,
  type ListMessagesQuery,
  type Message as MessageDto,
  type Page,
  type SendMessageInput,
} from "@chatbox/shared";

import { encryptAtRest } from "@/lib/crypto";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { sendPush } from "@/lib/push";
import { loadUsers, toObjectId } from "@/lib/viewer";
import { Conversation, type ConversationDoc } from "@/models/conversation";
import { Message, type AttachmentDoc, type MessageDoc } from "@/models/message";
import { User } from "@/models/user";
import { hub } from "@/realtime/hub";
import { presence } from "@/realtime/presence";
import { readText, toMessage, toPoll, toReactions } from "@/serializers/messages";
import {
  broadcastConversation,
  isAdmin,
  loadForMember,
  memberOf,
} from "@/modules/conversations/conversations.service";
import { resolveOwnedMedia } from "@/modules/media/media.service";

const memberIdsOf = (conversation: ConversationDoc) =>
  conversation.members.map((member) => member.userId.toString());

export const serializeMessages = async (messages: MessageDoc[]): Promise<MessageDto[]> => {
  const replyIds = messages.flatMap((message) => (message.replyToId ? [message.replyToId] : []));
  const replies = replyIds.length ? await Message.find({ _id: { $in: replyIds } }).lean<MessageDoc[]>() : [];
  const userIds = [...messages, ...replies].flatMap((message) =>
    message.senderId ? [message.senderId] : [],
  );
  const users = await loadUsers(userIds);
  const replyMap = new Map(replies.map((reply) => [reply._id.toString(), reply]));
  return messages.map((message) => toMessage(message, users, replyMap));
};

const serializeMessage = async (message: MessageDoc): Promise<MessageDto> => {
  const [dto] = await serializeMessages([message]);
  if (!dto) throw notFound("Message");
  return dto;
};

const lastMessageOf = (message: MessageDoc, senderName: string | null) => ({
  messageId: message._id,
  senderId: message.senderId ?? null,
  senderName,
  kind: message.kind,
  text: message.text ?? null,
  deleted: Boolean(message.deletedAt),
  createdAt: message.createdAt,
});

const notifyOffline = async (conversation: ConversationDoc, message: MessageDto, senderId: string | null) => {
  const now = Date.now();
  const recipients = conversation.members
    .filter((member) => member.userId.toString() !== senderId)
    .filter((member) => !member.mutedUntil || member.mutedUntil.getTime() < now)
    .map((member) => member.userId.toString());
  const offline = (
    await Promise.all(recipients.map(async (id) => ((await presence.isOnline(id)) ? null : id)))
  ).filter((id): id is string => id !== null);
  if (offline.length === 0) return;

  const body = previewText({ kind: message.kind, text: message.text, deleted: false }) || "New message";
  const senderName = message.sender?.name ?? "Someone";
  const isGroup = conversation.type === "group";
  await sendPush(offline, {
    title: isGroup ? (conversation.name ?? "Group") : senderName,
    body: isGroup ? `${senderName}: ${body}` : body,
    data: { type: "message", conversationId: message.conversationId, messageId: message.id },
    category: "message",
    collapseId: message.conversationId,
  });
};

// Persists the message, bumps conversation state and fans it out to every member.
const publish = async (
  conversation: ConversationDoc,
  doc: MessageDoc,
  senderId: string | null,
): Promise<MessageDto> => {
  const sender = senderId ? await User.findById(senderId, { name: 1 }).lean() : null;
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: lastMessageOf(doc, sender?.name ?? null),
        lastActivityAt: doc.createdAt,
        "members.$[].hidden": false,
      },
      $inc: { "members.$[other].unreadCount": doc.kind === "system" ? 0 : 1 },
    },
    { arrayFilters: [{ "other.userId": { $ne: senderId ? toObjectId(senderId) : null } }] },
  );

  const dto = await serializeMessage(doc);
  const members = memberIdsOf(conversation);
  const wasHidden = conversation.members
    .filter((member) => member.hidden)
    .map((member) => member.userId.toString());
  if (wasHidden.length) {
    const fresh = await Conversation.findById(conversation._id);
    if (fresh) await broadcastConversation(fresh, wasHidden);
  }
  hub.toUsers(members, "message:new", dto);
  if (doc.kind !== "system") void notifyOffline(conversation, dto, senderId).catch(() => undefined);
  return dto;
};

export const postSystemMessage = async (
  conversation: ConversationDoc,
  actorId: string,
  action: string,
): Promise<void> => {
  const actor = await User.findById(actorId, { name: 1 }).lean();
  const doc = await Message.create({
    conversationId: conversation._id,
    kind: "system",
    text: encryptAtRest(`${actor?.name ?? "Someone"} ${action}`),
  });
  await publish(conversation, doc.toObject(), null);
};

const buildAttachments = async (senderId: string, input: SendMessageInput): Promise<AttachmentDoc[]> => {
  const attachments = input.attachments ?? [];
  const owned = await resolveOwnedMedia(
    senderId,
    attachments.map((attachment) => attachment.key),
  );
  return attachments.map((attachment) => {
    const media = owned.get(attachment.key);
    if (!media) throw badRequest("Unknown attachment");
    return {
      kind: attachment.kind,
      key: attachment.key,
      url: media.url,
      name: attachment.name ?? null,
      mimeType: media.mimeType,
      size: media.size,
      width: attachment.width ?? null,
      height: attachment.height ?? null,
      durationSeconds: attachment.durationSeconds ?? null,
      waveform: attachment.waveform ?? null,
      viewOnce: attachment.viewOnce ?? false,
    };
  });
};

const assertCanSend = async (conversation: ConversationDoc, senderId: string) => {
  const member = memberOf(conversation, senderId);
  if (!member) throw notFound("Conversation");
  if (conversation.type === "group" && conversation.settings.onlyAdminsCanSend && !isAdmin(member)) {
    throw forbidden("Only admins can send messages in this group");
  }
  if (conversation.type === "direct") {
    const otherId = conversation.members.find((item) => item.userId.toString() !== senderId)?.userId;
    if (!otherId) throw forbidden("You can't message this user");
    const blocked = await User.exists({
      $or: [
        { _id: toObjectId(senderId), blockedUserIds: otherId },
        { _id: otherId, blockedUserIds: toObjectId(senderId) },
        { _id: otherId, disabledAt: { $ne: null } },
      ],
    });
    if (blocked) throw forbidden("You can't message this user");
  }
};

export const sendMessage = async (senderId: string, input: SendMessageInput): Promise<MessageDto> => {
  const existing = await Message.findOne({
    senderId: toObjectId(senderId),
    clientId: input.clientId,
  }).lean<MessageDoc>();
  if (existing) return serializeMessage(existing);

  const { conversation } = await loadForMember(input.conversationId, senderId);
  await assertCanSend(conversation, senderId);

  if (input.replyToId) {
    const reply = await Message.exists({
      _id: toObjectId(input.replyToId),
      conversationId: conversation._id,
    });
    if (!reply) throw badRequest("The message you're replying to no longer exists");
  }

  const text = input.text?.trim();
  const expiresAt = conversation.disappearingSeconds
    ? new Date(Date.now() + conversation.disappearingSeconds * 1000)
    : null;

  let created: MessageDoc;
  try {
    const doc = await Message.create({
      conversationId: conversation._id,
      senderId: toObjectId(senderId),
      clientId: input.clientId,
      kind: input.kind,
      text: text ? encryptAtRest(text) : null,
      attachments: await buildAttachments(senderId, input),
      location: input.location ?? null,
      contact: input.contact
        ? { ...input.contact, userId: input.contact.userId ? toObjectId(input.contact.userId) : null }
        : null,
      poll: input.poll
        ? {
            question: input.poll.question,
            allowMultiple: input.poll.allowMultiple,
            options: input.poll.options.map((option) => ({
              id: nanoid(8),
              text: option.text,
              description: option.description ?? null,
              voterIds: [],
            })),
          }
        : null,
      sticker: input.sticker ? { id: input.sticker.id, emoji: input.sticker.emoji ?? null } : null,
      replyToId: input.replyToId ? toObjectId(input.replyToId) : null,
      expiresAt,
    });
    created = doc.toObject();
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const duplicate = await Message.findOne({
      senderId: toObjectId(senderId),
      clientId: input.clientId,
    }).lean<MessageDoc>();
    if (!duplicate) throw error;
    return serializeMessage(duplicate);
  }

  return publish(conversation, created, senderId);
};

export const listMessages = async (
  userId: string,
  conversationId: string,
  query: ListMessagesQuery,
): Promise<Page<MessageDto>> => {
  const { member } = await loadForMember(conversationId, userId);
  const idFilter: Record<string, Types.ObjectId> = {};
  if (query.before) idFilter.$lt = toObjectId(query.before);
  if (query.after) idFilter.$gt = toObjectId(query.after);
  if (member.clearedAt) {
    const floor = Types.ObjectId.createFromTime(Math.floor(member.clearedAt.getTime() / 1000));
    if (!idFilter.$gt || idFilter.$gt < floor) idFilter.$gt = floor;
  }

  const filter = {
    conversationId: toObjectId(conversationId),
    hiddenFor: { $ne: toObjectId(userId) },
    ...(Object.keys(idFilter).length ? { _id: idFilter } : {}),
  };
  const ascending = Boolean(query.after) && !query.before;
  const docs = await Message.find(filter)
    .sort({ _id: ascending ? 1 : -1 })
    .limit(query.limit + 1)
    .lean<MessageDoc[]>();

  const hasMore = docs.length > query.limit;
  const page = docs.slice(0, query.limit);
  const chronological = ascending ? page : page.reverse();
  const items = await serializeMessages(chronological);
  const nextCursor = hasMore
    ? ((ascending ? chronological.at(-1) : chronological[0])?._id.toString() ?? null)
    : null;
  return { items, nextCursor };
};

const loadMessageForMember = async (userId: string, messageId: string) => {
  const message = await Message.findById(messageId);
  if (!message) throw notFound("Message");
  const { conversation, member } = await loadForMember(message.conversationId.toString(), userId);
  if (message.hiddenFor.some((id) => id.toString() === userId)) throw notFound("Message");
  return { message, conversation, member };
};

const refreshLastMessage = async (conversation: ConversationDoc, message: MessageDoc) => {
  if (conversation.lastMessage?.messageId.toString() !== message._id.toString()) return;
  const sender = message.senderId ? await User.findById(message.senderId, { name: 1 }).lean() : null;
  await Conversation.updateOne(
    { _id: conversation._id },
    { $set: { lastMessage: lastMessageOf(message, sender?.name ?? null) } },
  );
};

export const editMessage = async (userId: string, messageId: string, text: string): Promise<MessageDto> => {
  const { message, conversation } = await loadMessageForMember(userId, messageId);
  if (message.senderId?.toString() !== userId) throw forbidden("You can only edit your own messages");
  if (message.deletedAt) throw badRequest("This message was deleted");
  if (message.kind === "poll" || message.kind === "system") throw badRequest("This message can't be edited");
  if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS)
    throw badRequest("Messages can only be edited for 15 minutes");

  message.text = encryptAtRest(text);
  message.editedAt = new Date();
  await message.save();
  await refreshLastMessage(conversation, message.toObject());

  const dto = await serializeMessage(message.toObject());
  hub.toUsers(memberIdsOf(conversation), "message:updated", dto);
  return dto;
};

export const deleteMessage = async (
  userId: string,
  messageId: string,
  scope: "me" | "everyone",
): Promise<void> => {
  const { message, conversation, member } = await loadMessageForMember(userId, messageId);

  if (scope === "me") {
    await Message.updateOne({ _id: message._id }, { $addToSet: { hiddenFor: toObjectId(userId) } });
    hub.toUsers([userId], "message:deleted", { conversationId: conversation._id.toString(), messageId });
    return;
  }

  const isSender = message.senderId?.toString() === userId;
  const canModerate = conversation.type === "group" && isAdmin(member);
  if (!isSender && !canModerate) throw forbidden("You can only delete your own messages for everyone");
  if (isSender && Date.now() - message.createdAt.getTime() > DELETE_FOR_EVERYONE_WINDOW_MS) {
    throw badRequest("This message is too old to delete for everyone");
  }

  message.deletedAt = new Date();
  message.text = null;
  message.attachments = [];
  message.poll = null;
  message.location = null;
  message.contact = null;
  message.sticker = null;
  message.reactions = [];
  await message.save();
  await refreshLastMessage(conversation, message.toObject());

  hub.toUsers(memberIdsOf(conversation), "message:updated", await serializeMessage(message.toObject()));
};

export const reactToMessage = async (
  userId: string,
  messageId: string,
  emoji: string | null,
): Promise<void> => {
  const { message, conversation } = await loadMessageForMember(userId, messageId);
  if (message.deletedAt) throw badRequest("This message was deleted");

  const reactions = message.reactions.filter((reaction) => reaction.userId.toString() !== userId);
  if (emoji) reactions.push({ userId: toObjectId(userId), emoji });
  message.reactions = reactions;
  await message.save();

  hub.toUsers(memberIdsOf(conversation), "message:reactions", {
    conversationId: conversation._id.toString(),
    messageId,
    reactions: toReactions(message.reactions),
  });
};

export const votePoll = async (userId: string, messageId: string, optionIds: string[]): Promise<void> => {
  const { message, conversation } = await loadMessageForMember(userId, messageId);
  const poll = message.poll;
  if (!poll || message.deletedAt) throw badRequest("This isn't a poll");
  if (poll.closedAt) throw badRequest("This poll is closed");
  const unique = [...new Set(optionIds)];
  if (!poll.allowMultiple && unique.length > 1) throw badRequest("You can only pick one option");
  const valid = new Set(poll.options.map((option) => option.id));
  if (unique.some((id) => !valid.has(id))) throw badRequest("Unknown poll option");

  const voter = toObjectId(userId);
  await Message.updateOne({ _id: message._id }, { $pull: { "poll.options.$[].voterIds": voter } });
  if (unique.length > 0) {
    await Message.updateOne(
      { _id: message._id },
      { $addToSet: { "poll.options.$[option].voterIds": voter } },
      { arrayFilters: [{ "option.id": { $in: unique } }] },
    );
  }

  const fresh = await Message.findById(message._id).lean<MessageDoc>();
  if (!fresh?.poll) return;
  hub.toUsers(memberIdsOf(conversation), "poll:updated", {
    conversationId: conversation._id.toString(),
    messageId,
    poll: toPoll(fresh.poll),
  });
};

export const forwardMessage = async (
  userId: string,
  messageId: string,
  conversationIds: string[],
): Promise<MessageDto[]> => {
  const { message } = await loadMessageForMember(userId, messageId);
  if (message.deletedAt || message.kind === "system" || message.kind === "poll")
    throw badRequest("This message can't be forwarded");
  if (message.attachments.some((attachment) => attachment.viewOnce))
    throw badRequest("View-once media can't be forwarded");

  const results: MessageDto[] = [];
  for (const conversationId of [...new Set(conversationIds)]) {
    const { conversation } = await loadForMember(conversationId, userId);
    await assertCanSend(conversation, userId);
    const doc = await Message.create({
      conversationId: conversation._id,
      senderId: toObjectId(userId),
      clientId: `fwd-${nanoid(16)}`,
      kind: message.kind,
      text: message.text ? encryptAtRest(readText(message.text) ?? "") : null,
      attachments: message.attachments,
      location: message.location,
      contact: message.contact,
      sticker: message.sticker,
      expiresAt: conversation.disappearingSeconds
        ? new Date(Date.now() + conversation.disappearingSeconds * 1000)
        : null,
    });
    results.push(await publish(conversation, doc.toObject(), userId));
  }
  return results;
};

export const sharedMedia = async (
  userId: string,
  conversationId: string,
  kind: "media" | "document" | "audio",
  before: string | undefined,
  limit: number,
): Promise<Page<MessageDto>> => {
  const { member } = await loadForMember(conversationId, userId);
  const kinds = { media: ["image", "video"], document: ["document"], audio: ["audio"] }[kind];
  const idFilter: Record<string, Types.ObjectId> = {};
  if (before) idFilter.$lt = toObjectId(before);
  if (member.clearedAt)
    idFilter.$gt = Types.ObjectId.createFromTime(Math.floor(member.clearedAt.getTime() / 1000));

  const docs = await Message.find({
    conversationId: toObjectId(conversationId),
    kind: { $in: kinds },
    deletedAt: null,
    hiddenFor: { $ne: toObjectId(userId) },
    "attachments.viewOnce": { $ne: true },
    ...(Object.keys(idFilter).length ? { _id: idFilter } : {}),
  })
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean<MessageDoc[]>();
  const page = docs.slice(0, limit);
  return {
    items: await serializeMessages(page),
    nextCursor: docs.length > limit ? (page.at(-1)?._id.toString() ?? null) : null,
  };
};
