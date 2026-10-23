import { describe, expect, it } from "vitest";

import type { Conversation, Message, Page, PublicUser } from "@chatbox/shared";

import { Message as MessageModel } from "@/models/message";
import { json, registerUser, setupServer } from "./helpers";

const ctx = setupServer();

const send = (
  auth: { authorization: string },
  conversationId: string,
  text: string,
  extra: Record<string, unknown> = {},
) =>
  ctx.app.inject({
    method: "POST",
    url: "/v1/messages",
    headers: auth,
    payload: {
      conversationId,
      clientId: `client-${Math.random().toString(36).slice(2)}`,
      kind: "text",
      text,
      ...extra,
    },
  });

describe("conversations and messages", () => {
  it("creates a direct chat that only appears for the recipient after the first message", async () => {
    const alice = await registerUser(ctx.app, { name: "Alice" });
    const bob = await registerUser(ctx.app, { name: "Bob" });

    const created = await ctx.app.inject({
      method: "POST",
      url: "/v1/conversations/direct",
      headers: alice.auth,
      payload: { userId: bob.user.id },
    });
    const conversation = json<Conversation>(created);
    expect(conversation.type).toBe("direct");

    const again = await ctx.app.inject({
      method: "POST",
      url: "/v1/conversations/direct",
      headers: alice.auth,
      payload: { userId: bob.user.id },
    });
    expect(json<Conversation>(again).id).toBe(conversation.id);

    const before = await ctx.app.inject({ method: "GET", url: "/v1/conversations", headers: bob.auth });
    expect(json<{ items: Conversation[] }>(before).items).toHaveLength(0);

    expect((await send(alice.auth, conversation.id, "Hi Bob")).statusCode).toBe(201);

    const after = json<{ items: Conversation[] }>(
      await ctx.app.inject({ method: "GET", url: "/v1/conversations", headers: bob.auth }),
    );
    expect(after.items).toHaveLength(1);
    expect(after.items[0]?.unreadCount).toBe(1);
    expect(after.items[0]?.lastMessage?.text).toBe("Hi Bob");
  });

  it("encrypts message text at rest and paginates history", async () => {
    const alice = await registerUser(ctx.app);
    const bob = await registerUser(ctx.app);
    const conversation = json<Conversation>(
      await ctx.app.inject({
        method: "POST",
        url: "/v1/conversations/direct",
        headers: alice.auth,
        payload: { userId: bob.user.id },
      }),
    );
    for (let index = 0; index < 5; index += 1) await send(alice.auth, conversation.id, `message ${index}`);

    const raw = await MessageModel.findOne({ conversationId: conversation.id }).lean();
    expect(raw?.text).toMatch(/^v1\./);
    expect(raw?.text).not.toContain("message");

    const firstPage = json<Page<Message>>(
      await ctx.app.inject({
        method: "GET",
        url: `/v1/conversations/${conversation.id}/messages?limit=3`,
        headers: bob.auth,
      }),
    );
    expect(firstPage.items.map((message) => message.text)).toEqual(["message 2", "message 3", "message 4"]);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondPage = json<Page<Message>>(
      await ctx.app.inject({
        method: "GET",
        url: `/v1/conversations/${conversation.id}/messages?limit=3&before=${firstPage.nextCursor}`,
        headers: bob.auth,
      }),
    );
    expect(secondPage.items.map((message) => message.text)).toEqual(["message 0", "message 1"]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it("keeps message sends idempotent per client id", async () => {
    const alice = await registerUser(ctx.app);
    const bob = await registerUser(ctx.app);
    const conversation = json<Conversation>(
      await ctx.app.inject({
        method: "POST",
        url: "/v1/conversations/direct",
        headers: alice.auth,
        payload: { userId: bob.user.id },
      }),
    );
    const payload = {
      conversationId: conversation.id,
      clientId: "client-fixed-123",
      kind: "text",
      text: "once",
    };
    const first = json<Message>(
      await ctx.app.inject({ method: "POST", url: "/v1/messages", headers: alice.auth, payload }),
    );
    const second = json<Message>(
      await ctx.app.inject({ method: "POST", url: "/v1/messages", headers: alice.auth, payload }),
    );
    expect(second.id).toBe(first.id);
    expect(await MessageModel.countDocuments({ conversationId: conversation.id })).toBe(1);
  });

  it("prevents non-members from reading and blocked users from messaging", async () => {
    const alice = await registerUser(ctx.app);
    const bob = await registerUser(ctx.app);
    const eve = await registerUser(ctx.app);
    const conversation = json<Conversation>(
      await ctx.app.inject({
        method: "POST",
        url: "/v1/conversations/direct",
        headers: alice.auth,
        payload: { userId: bob.user.id },
      }),
    );

    const snoop = await ctx.app.inject({
      method: "GET",
      url: `/v1/conversations/${conversation.id}/messages`,
      headers: eve.auth,
    });
    expect(snoop.statusCode).toBe(404);

    await ctx.app.inject({ method: "PUT", url: `/v1/users/${alice.user.id}/block`, headers: bob.auth });
    expect((await send(alice.auth, conversation.id, "hello?")).statusCode).toBe(403);
  });

  it("manages groups: roles, permissions, membership and invites", async () => {
    const owner = await registerUser(ctx.app, { name: "Owner" });
    const member = await registerUser(ctx.app, { name: "Member" });
    const extra = await registerUser(ctx.app, { name: "Extra" });
    const joiner = await registerUser(ctx.app, { name: "Joiner" });

    const group = json<Conversation>(
      await ctx.app.inject({
        method: "POST",
        url: "/v1/conversations/group",
        headers: owner.auth,
        payload: { name: "Team Align", tags: ["Group work"], memberIds: [member.user.id] },
      }),
    );
    expect(group.members.map((item) => item.role).sort()).toEqual(["member", "owner"]);

    const forbiddenAdd = await ctx.app.inject({
      method: "POST",
      url: `/v1/conversations/${group.id}/members`,
      headers: member.auth,
      payload: { userIds: [extra.user.id] },
    });
    expect(forbiddenAdd.statusCode).toBe(403);

    await ctx.app.inject({
      method: "PATCH",
      url: `/v1/conversations/${group.id}/members/${member.user.id}`,
      headers: owner.auth,
      payload: { role: "admin" },
    });
    const added = await ctx.app.inject({
      method: "POST",
      url: `/v1/conversations/${group.id}/members`,
      headers: member.auth,
      payload: { userIds: [extra.user.id] },
    });
    expect(json<Conversation>(added).members).toHaveLength(3);

    const invite = json<{ inviteCode: string }>(
      await ctx.app.inject({
        method: "POST",
        url: `/v1/conversations/${group.id}/invite`,
        headers: owner.auth,
      }),
    );
    const preview = await ctx.app.inject({
      method: "GET",
      url: `/v1/invites/${invite.inviteCode}`,
      headers: joiner.auth,
    });
    expect(json<{ memberCount: number }>(preview).memberCount).toBe(3);
    const joined = await ctx.app.inject({
      method: "POST",
      url: `/v1/invites/${invite.inviteCode}/join`,
      headers: joiner.auth,
    });
    expect(json<Conversation>(joined).members).toHaveLength(4);
    expect(json<Conversation>(joined).inviteCode).toBeNull();

    await ctx.app.inject({ method: "POST", url: `/v1/conversations/${group.id}/leave`, headers: owner.auth });
    const afterLeave = json<Conversation>(
      await ctx.app.inject({ method: "GET", url: `/v1/conversations/${group.id}`, headers: member.auth }),
    );
    expect(afterLeave.members.find((item) => item.user.id === member.user.id)?.role).toBe("owner");

    const history = json<Page<Message>>(
      await ctx.app.inject({
        method: "GET",
        url: `/v1/conversations/${group.id}/messages`,
        headers: member.auth,
      }),
    );
    expect(history.items.filter((message) => message.kind === "system").length).toBeGreaterThanOrEqual(3);
  });

  it("supports edits, reactions, delete for everyone, polls and forwarding", async () => {
    const alice = await registerUser(ctx.app);
    const bob = await registerUser(ctx.app);
    const conversation = json<Conversation>(
      await ctx.app.inject({
        method: "POST",
        url: "/v1/conversations/direct",
        headers: alice.auth,
        payload: { userId: bob.user.id },
      }),
    );
    const message = json<Message>(await send(alice.auth, conversation.id, "typo"));

    const edited = json<Message>(
      await ctx.app.inject({
        method: "PATCH",
        url: `/v1/messages/${message.id}`,
        headers: alice.auth,
        payload: { text: "fixed" },
      }),
    );
    expect(edited.text).toBe("fixed");
    expect(edited.editedAt).not.toBeNull();
    expect(
      (
        await ctx.app.inject({
          method: "PATCH",
          url: `/v1/messages/${message.id}`,
          headers: bob.auth,
          payload: { text: "hack" },
        })
      ).statusCode,
    ).toBe(403);

    expect(
      (
        await ctx.app.inject({
          method: "PUT",
          url: `/v1/messages/${message.id}/reaction`,
          headers: bob.auth,
          payload: { emoji: "👍" },
        })
      ).statusCode,
    ).toBe(204);

    const poll = json<Message>(
      await send(alice.auth, conversation.id, "", {
        kind: "poll",
        text: undefined,
        poll: {
          question: "What would you like to work on?",
          options: [{ text: "Thought" }, { text: "Design" }],
        },
      }),
    );
    const optionId = poll.poll?.options[1]?.id ?? "";
    expect(
      (
        await ctx.app.inject({
          method: "PUT",
          url: `/v1/messages/${poll.id}/vote`,
          headers: bob.auth,
          payload: { optionIds: [optionId] },
        })
      ).statusCode,
    ).toBe(204);
    const badVote = await ctx.app.inject({
      method: "PUT",
      url: `/v1/messages/${poll.id}/vote`,
      headers: bob.auth,
      payload: { optionIds: poll.poll?.options.map((option) => option.id) },
    });
    expect(badVote.statusCode).toBe(400);

    const group = json<Conversation>(
      await ctx.app.inject({
        method: "POST",
        url: "/v1/conversations/group",
        headers: alice.auth,
        payload: { name: "Fwd", memberIds: [bob.user.id] },
      }),
    );
    const forwarded = await ctx.app.inject({
      method: "POST",
      url: `/v1/messages/${message.id}/forward`,
      headers: alice.auth,
      payload: { conversationIds: [group.id] },
    });
    expect(json<{ items: Message[] }>(forwarded).items[0]?.text).toBe("fixed");

    expect(
      (
        await ctx.app.inject({
          method: "DELETE",
          url: `/v1/messages/${message.id}?scope=everyone`,
          headers: alice.auth,
        })
      ).statusCode,
    ).toBe(204);
    const history = json<Page<Message>>(
      await ctx.app.inject({
        method: "GET",
        url: `/v1/conversations/${conversation.id}/messages`,
        headers: bob.auth,
      }),
    );
    const tombstone = history.items.find((item) => item.id === message.id);
    expect(tombstone?.deletedAt).not.toBeNull();
    expect(tombstone?.text).toBeNull();
    expect(history.items.find((item) => item.id === poll.id)?.poll?.options[1]?.voterIds).toEqual([
      bob.user.id,
    ]);
  });

  it("respects profile privacy and supports search and discovery", async () => {
    const alice = await registerUser(ctx.app, { name: "Alice Private" });
    const bob = await registerUser(ctx.app, { name: "Bob Seeker" });
    await ctx.app.inject({
      method: "PATCH",
      url: "/v1/users/me",
      headers: alice.auth,
      payload: { handle: "alice_p", phone: "+14155550123", about: "Hi" },
    });
    await ctx.app.inject({
      method: "PATCH",
      url: "/v1/users/me/privacy",
      headers: alice.auth,
      payload: { about: "contacts" },
    });

    const found = json<{ items: PublicUser[] }>(
      await ctx.app.inject({ method: "GET", url: "/v1/users/search?q=@alice", headers: bob.auth }),
    );
    expect(found.items[0]?.handle).toBe("alice_p");
    expect(found.items[0]?.about).toBeNull();
    expect(found.items[0]?.phone).toBeNull();

    const discovered = json<{ items: { user: PublicUser }[] }>(
      await ctx.app.inject({
        method: "POST",
        url: "/v1/users/discover",
        headers: bob.auth,
        payload: { phones: ["+1 415 555 0123"] },
      }),
    );
    expect(discovered.items).toHaveLength(1);

    await ctx.app.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: alice.auth,
      payload: { userId: bob.user.id },
    });
    const visible = json<PublicUser>(
      await ctx.app.inject({ method: "GET", url: `/v1/users/${alice.user.id}`, headers: bob.auth }),
    );
    expect(visible.about).toBe("Hi");

    const taken = await ctx.app.inject({
      method: "PATCH",
      url: "/v1/users/me",
      headers: bob.auth,
      payload: { handle: "Alice_P" },
    });
    expect(taken.statusCode).toBe(409);
  });
});
