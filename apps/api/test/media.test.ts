import { describe, expect, it } from "vitest";

import type { Conversation, CurrentUser, MediaUpload, Message } from "@chatbox/shared";

import { json, registerUser, setupServer } from "./helpers";

const ctx = setupServer();

// Smallest valid PNG (1x1 transparent pixel).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const multipart = (filename: string, mime: string, content: Buffer) => {
  const boundary = "----chatbox-test-boundary";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
    ),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload: body, headers: { "content-type": `multipart/form-data; boundary=${boundary}` } };
};

describe("media", () => {
  it("uploads, serves and attaches media safely", async () => {
    const alice = await registerUser(ctx.app);
    const bob = await registerUser(ctx.app);

    const upload = multipart("pixel.png", "image/png", PNG);
    const response = await ctx.app.inject({
      method: "POST",
      url: "/v1/media",
      headers: { ...alice.auth, ...upload.headers },
      payload: upload.payload,
    });
    expect(response.statusCode).toBe(201);
    const media = json<MediaUpload>(response);
    expect(media.mimeType).toBe("image/png");

    const served = await ctx.app.inject({ method: "GET", url: new URL(media.url).pathname });
    expect(served.statusCode).toBe(200);
    expect(served.headers["content-type"]).toBe("image/png");
    expect(served.headers["x-content-type-options"]).toBe("nosniff");

    const conversation = json<Conversation>(
      await ctx.app.inject({
        method: "POST",
        url: "/v1/conversations/direct",
        headers: alice.auth,
        payload: { userId: bob.user.id },
      }),
    );
    const attachment = { kind: "image", key: media.key, mimeType: "image/png", size: media.size };
    const sent = await ctx.app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: alice.auth,
      payload: {
        conversationId: conversation.id,
        clientId: "media-message-1",
        kind: "image",
        attachments: [attachment],
      },
    });
    expect(json<Message>(sent).attachments[0]?.url).toBe(media.url);

    const stolen = await ctx.app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: bob.auth,
      payload: {
        conversationId: conversation.id,
        clientId: "media-message-2",
        kind: "image",
        attachments: [attachment],
      },
    });
    expect(stolen.statusCode).toBe(400);
  });

  it("rejects disguised and disallowed files", async () => {
    const alice = await registerUser(ctx.app);
    const fake = multipart("evil.png", "image/png", Buffer.from("<script>alert(1)</script>"));
    const disguised = await ctx.app.inject({
      method: "POST",
      url: "/v1/media",
      headers: { ...alice.auth, ...fake.headers },
      payload: fake.payload,
    });
    expect(disguised.statusCode).toBe(400);

    const html = multipart("page.html", "text/html", Buffer.from("<html></html>"));
    const rejected = await ctx.app.inject({
      method: "POST",
      url: "/v1/media",
      headers: { ...alice.auth, ...html.headers },
      payload: html.payload,
    });
    expect(rejected.statusCode).toBe(400);
  });

  it("sets a profile avatar", async () => {
    const alice = await registerUser(ctx.app);
    const upload = multipart("me.png", "image/png", PNG);
    const response = await ctx.app.inject({
      method: "PUT",
      url: "/v1/users/me/avatar",
      headers: { ...alice.auth, ...upload.headers },
      payload: upload.payload,
    });
    expect(json<CurrentUser>(response).avatarUrl).toMatch(/\/files\/avatars\//);
  });
});
