import type { Conversation, ConversationMember, Message, MessagePreview, UserSummary } from "./types";

export type DeliveryStatus = "pending" | "sent" | "delivered" | "read";

export const otherMembers = (conversation: Conversation, myId: string): ConversationMember[] =>
  conversation.members.filter((member) => member.user.id !== myId);

export const conversationTitle = (conversation: Conversation, myId: string): string => {
  if (conversation.type === "group") return conversation.name ?? "Group";
  return otherMembers(conversation, myId)[0]?.user.name ?? "Deleted account";
};

export const conversationAvatar = (conversation: Conversation, myId: string): string | null => {
  if (conversation.type === "group") return conversation.avatarUrl;
  return otherMembers(conversation, myId)[0]?.user.avatarUrl ?? null;
};

export const directPeer = (conversation: Conversation, myId: string): UserSummary | null =>
  conversation.type === "direct" ? (otherMembers(conversation, myId)[0]?.user ?? null) : null;

// A message is delivered/read once every other member's pointer has passed its timestamp.
export const deliveryStatus = (
  message: Message,
  conversation: Conversation,
  myId: string,
): DeliveryStatus => {
  if (message.sender?.id !== myId) return "sent";
  const others = otherMembers(conversation, myId);
  if (others.length === 0) return "sent";
  const created = Date.parse(message.createdAt);
  const passed = (value: string | null) => value !== null && Date.parse(value) >= created;
  if (others.every((member) => passed(member.lastReadAt))) return "read";
  if (others.every((member) => passed(member.lastDeliveredAt) || passed(member.lastReadAt)))
    return "delivered";
  return "sent";
};

export const previewText = (preview: Pick<MessagePreview, "kind" | "text" | "deleted">): string => {
  if (preview.deleted) return "This message was deleted";
  const labels: Record<string, string> = {
    image: "📷 Photo",
    video: "🎥 Video",
    audio: "🎤 Voice message",
    document: "📄 Document",
    location: "📍 Location",
    sticker: "Sticker",
    video_note: "⏺ Video message",
    contact: "👤 Contact",
    poll: "📊 Poll",
  };
  if (preview.kind === "text" || preview.kind === "system") return preview.text ?? "";
  const label = labels[preview.kind] ?? "";
  return preview.text ? `${label} · ${preview.text}` : label;
};
