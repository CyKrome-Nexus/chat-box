import { describe, expect, it } from "vitest";

import type { Conversation, IceConfig, Message } from "@chatbox/shared";

import { connectSocket, json, nextEvent, registerUser, setupServer } from "./helpers";

const ctx = setupServer();

describe("realtime gateway", () => {
  it("rejects connections without a valid token", async () => {
    await expect(connectSocket(ctx.url, "not-a-token")).rejects.toThrow();
  });

  it("delivers messages, typing, receipts and calls between members", async () => {
    const alice = await registerUser(ctx.app, { name: "Alice" });
    const bob = await registerUser(ctx.app, { name: "Bob" });
    const conversation = json<Conversation>(
      await ctx.app.inject({
        method: "POST",
        url: "/v1/conversations/direct",
        headers: alice.auth,
        payload: { userId: bob.user.id },
      }),
    );

    const aliceSocket = await connectSocket(ctx.url, alice.tokens.accessToken);
    const bobSocket = await connectSocket(ctx.url, bob.tokens.accessToken);

    try {
      const incoming = nextEvent(bobSocket, "message:new");
      const ack = await aliceSocket.emitWithAck("message:send", {
        conversationId: conversation.id,
        clientId: "socket-client-1",
        kind: "text",
        text: "over the wire",
      });
      expect(ack.ok).toBe(true);
      const received = (await incoming) as Message;
      expect(received.text).toBe("over the wire");
      expect(received.sender?.id).toBe(alice.user.id);

      const typing = nextEvent(aliceSocket, "typing:update");
      bobSocket.emit("typing:update", { conversationId: conversation.id, isTyping: true });
      expect(await typing).toMatchObject({ userId: bob.user.id, isTyping: true });

      const receipt = nextEvent(aliceSocket, "receipt:update");
      bobSocket.emit("message:read", { conversationId: conversation.id, messageId: received.id });
      expect(await receipt).toMatchObject({ status: "read", userId: bob.user.id });

      const invalid = await aliceSocket.emitWithAck("message:send", {
        conversationId: conversation.id,
        clientId: "socket-client-2",
        kind: "text",
      } as never);
      expect(invalid.ok).toBe(false);

      const ring = nextEvent(bobSocket, "call:incoming");
      const call = await aliceSocket.emitWithAck("call:invite", {
        conversationId: conversation.id,
        type: "video",
      });
      expect(call.ok).toBe(true);
      const invite = await ring;
      expect(invite.type).toBe("video");

      const signal = nextEvent(bobSocket, "call:signal");
      aliceSocket.emit("call:signal", {
        callId: invite.callId,
        toUserId: bob.user.id,
        sdp: "v=0",
        sdpType: "offer",
      });
      expect(await signal).toMatchObject({ fromUserId: alice.user.id, sdpType: "offer" });

      const accepted = Promise.all([
        nextEvent(aliceSocket, "call:state"),
        nextEvent(bobSocket, "call:state"),
      ]);
      bobSocket.emit("call:accept", { callId: invite.callId });
      expect((await accepted).map((event) => event.state)).toEqual(["accepted", "accepted"]);

      const ended = nextEvent(bobSocket, "call:state");
      aliceSocket.emit("call:end", { callId: invite.callId });
      expect(await ended).toMatchObject({ state: "ended" });

      const history = json<{ items: { status: string }[] }>(
        await ctx.app.inject({ method: "GET", url: "/v1/calls", headers: bob.auth }),
      );
      expect(history.items[0]?.status).toBe("completed");

      const ice = json<IceConfig>(
        await ctx.app.inject({ method: "GET", url: "/v1/calls/ice-servers", headers: bob.auth }),
      );
      expect(ice.iceServers.some((server) => server.credential)).toBe(true);
    } finally {
      aliceSocket.disconnect();
      bobSocket.disconnect();
    }
  });

  it("does not leak events to non-members", async () => {
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
    const eveSocket = await connectSocket(ctx.url, eve.tokens.accessToken);
    try {
      const leaked = nextEvent(eveSocket, "typing:update", 500).then(
        () => true,
        () => false,
      );
      eveSocket.emit("typing:update", { conversationId: conversation.id, isTyping: true });
      await ctx.app.inject({
        method: "POST",
        url: "/v1/messages",
        headers: alice.auth,
        payload: {
          conversationId: conversation.id,
          clientId: "private-message-1",
          kind: "text",
          text: "secret",
        },
      });
      expect(await leaked).toBe(false);
    } finally {
      eveSocket.disconnect();
    }
  });
});
