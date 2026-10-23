import type { Attachment, Message, MessagePreview, Poll, Reaction, ReplyPreview } from "@chatbox/shared";

import { decryptAtRest } from "@/lib/crypto";
import type { LeanUser } from "@/lib/viewer";
import type { LastMessageDoc } from "@/models/conversation";
import type { AttachmentDoc, MessageDoc } from "@/models/message";
import { toUserSummary } from "./users";

export const readText = (value: string | null | undefined): string | null => {
  if (!value) return null;
  try {
    return decryptAtRest(value);
  } catch {
    return null;
  }
};

export const toAttachment = (attachment: AttachmentDoc): Attachment => ({
  kind: attachment.kind,
  key: attachment.key,
  url: attachment.url,
  name: attachment.name ?? null,
  mimeType: attachment.mimeType,
  size: attachment.size,
  width: attachment.width ?? null,
  height: attachment.height ?? null,
  durationSeconds: attachment.durationSeconds ?? null,
  waveform: attachment.waveform?.length ? attachment.waveform : null,
  viewOnce: attachment.viewOnce ?? false,
});

export const toPoll = (poll: NonNullable<MessageDoc["poll"]>): Poll => ({
  question: poll.question,
  allowMultiple: poll.allowMultiple,
  closedAt: poll.closedAt?.toISOString() ?? null,
  options: poll.options.map((option) => ({
    id: option.id,
    text: option.text,
    description: option.description ?? null,
    voterIds: option.voterIds.map(String),
  })),
});

export const toReactions = (reactions: MessageDoc["reactions"]): Reaction[] => {
  const grouped = new Map<string, string[]>();
  for (const reaction of reactions) {
    grouped.set(reaction.emoji, [...(grouped.get(reaction.emoji) ?? []), reaction.userId.toString()]);
  }
  return [...grouped].map(([emoji, userIds]) => ({ emoji, userIds }));
};

export const toReplyPreview = (reply: MessageDoc, users: Map<string, LeanUser>): ReplyPreview => {
  const deleted = Boolean(reply.deletedAt);
  const sender = reply.senderId ? users.get(reply.senderId.toString()) : undefined;
  return {
    id: reply._id.toString(),
    senderId: reply.senderId?.toString() ?? null,
    senderName: sender?.name ?? null,
    kind: reply.kind,
    text: deleted ? null : readText(reply.text),
  };
};

// Sender summaries in broadcasts use public visibility only; per-viewer avatars come from conversation members.
export const toMessage = (
  message: MessageDoc,
  users: Map<string, LeanUser>,
  replies: Map<string, MessageDoc> = new Map(),
): Message => {
  const deleted = Boolean(message.deletedAt);
  const reply = message.replyToId ? replies.get(message.replyToId.toString()) : undefined;
  return {
    id: message._id.toString(),
    clientId: message.clientId ?? null,
    conversationId: message.conversationId.toString(),
    sender: message.senderId ? toUserSummary(users.get(message.senderId.toString()), null) : null,
    kind: message.kind,
    text: deleted ? null : readText(message.text),
    attachments: deleted ? [] : message.attachments.map(toAttachment),
    location:
      deleted || !message.location
        ? null
        : {
            latitude: message.location.latitude,
            longitude: message.location.longitude,
            label: message.location.label ?? null,
          },
    contact:
      deleted || !message.contact
        ? null
        : {
            name: message.contact.name,
            phone: message.contact.phone ?? null,
            email: message.contact.email ?? null,
            userId: message.contact.userId?.toString() ?? null,
          },
    poll: deleted || !message.poll ? null : toPoll(message.poll),
    sticker:
      deleted || !message.sticker ? null : { id: message.sticker.id, emoji: message.sticker.emoji ?? null },
    replyTo: reply ? toReplyPreview(reply, users) : null,
    reactions: deleted ? [] : toReactions(message.reactions),
    editedAt: message.editedAt?.toISOString() ?? null,
    deletedAt: message.deletedAt?.toISOString() ?? null,
    expiresAt: message.expiresAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  };
};

export const toMessagePreview = (last: LastMessageDoc): MessagePreview => ({
  id: last.messageId.toString(),
  senderId: last.senderId?.toString() ?? null,
  senderName: last.senderName ?? null,
  kind: last.kind,
  text: last.deleted ? null : readText(last.text),
  deleted: last.deleted,
  createdAt: last.createdAt.toISOString(),
});
