import { describe, expect, it } from "vitest";

import { handleSchema, phoneSchema, registerSchema, sendMessageSchema } from "./index";
import { deliveryStatus, previewText } from "./utils";
import type { Conversation, ConversationMember, Message } from "./types";

const member = (id: string, overrides: Partial<ConversationMember> = {}): ConversationMember => ({
  user: { id, name: id, handle: null, avatarUrl: null },
  role: "member",
  joinedAt: "2026-01-01T00:00:00.000Z",
  lastReadMessageId: null,
  lastReadAt: null,
  lastDeliveredAt: null,
  ...overrides,
});

const conversation = (members: ConversationMember[]): Conversation => ({
  id: "c1",
  type: "group",
  name: "Team",
  description: null,
  avatarUrl: null,
  tags: [],
  members,
  settings: { onlyAdminsCanSend: false, onlyAdminsCanEditInfo: true, onlyAdminsCanAddMembers: true },
  inviteCode: null,
  disappearingSeconds: null,
  lastMessage: null,
  unreadCount: 0,
  mutedUntil: null,
  createdById: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const message = (createdAt: string): Message => ({
  id: "m1",
  clientId: null,
  conversationId: "c1",
  sender: { id: "me", name: "Me", handle: null, avatarUrl: null },
  kind: "text",
  text: "hi",
  attachments: [],
  location: null,
  contact: null,
  poll: null,
  sticker: null,
  replyTo: null,
  reactions: [],
  editedAt: null,
  deletedAt: null,
  expiresAt: null,
  createdAt,
});

describe("schemas", () => {
  it("normalises handles and phones", () => {
    expect(handleSchema.parse("Alice_P")).toBe("alice_p");
    expect(handleSchema.safeParse("a__b").success).toBe(false);
    expect(phoneSchema.parse("+1 (415) 555-0123")).toBe("+14155550123");
    expect(phoneSchema.safeParse("4155550123").success).toBe(false);
  });

  it("requires an email or phone to register", () => {
    expect(registerSchema.safeParse({ name: "A", password: "secret-pass-1" }).success).toBe(false);
    expect(
      registerSchema.safeParse({ name: "A", email: "a@example.com", password: "secret-pass-1" }).success,
    ).toBe(true);
  });

  it("requires content matching the message kind", () => {
    const base = { conversationId: "a".repeat(24), clientId: "client-123" };
    expect(sendMessageSchema.safeParse({ ...base, kind: "text", text: "  " }).success).toBe(false);
    expect(
      sendMessageSchema.safeParse({ ...base, kind: "sticker", sticker: { id: "classic-spin" } }).success,
    ).toBe(true);
    expect(sendMessageSchema.safeParse({ ...base, kind: "image" }).success).toBe(false);
  });
});

describe("deliveryStatus", () => {
  const sent = message("2026-01-02T10:00:00.000Z");

  it("waits for every other member before reporting read", () => {
    const partial = conversation([
      member("me"),
      member("a", { lastReadAt: "2026-01-02T10:00:00.000Z" }),
      member("b", { lastDeliveredAt: "2026-01-02T10:00:00.000Z" }),
    ]);
    expect(deliveryStatus(sent, partial, "me")).toBe("delivered");

    const read = conversation([
      member("me"),
      member("a", { lastReadAt: "2026-01-02T11:00:00.000Z" }),
      member("b", { lastReadAt: "2026-01-02T10:00:00.000Z" }),
    ]);
    expect(deliveryStatus(sent, read, "me")).toBe("read");
  });

  it("treats other people's messages as plain sent", () => {
    expect(
      deliveryStatus(
        { ...sent, sender: { id: "a", name: "a", handle: null, avatarUrl: null } },
        conversation([member("me"), member("a")]),
        "me",
      ),
    ).toBe("sent");
  });
});

describe("previewText", () => {
  it("labels non-text messages", () => {
    expect(previewText({ kind: "poll", text: null, deleted: false })).toBe("📊 Poll");
    expect(previewText({ kind: "image", text: "Look", deleted: false })).toBe("📷 Photo · Look");
    expect(previewText({ kind: "text", text: "secret", deleted: true })).toBe("This message was deleted");
  });
});
