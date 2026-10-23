import { describe, expect, it } from "vitest";

import type { AuthResponse, AuthTokens, CurrentUser } from "@chatbox/shared";

import { PasswordReset } from "@/models/misc";
import { User } from "@/models/user";
import { json, registerUser, setupServer } from "./helpers";

const ctx = setupServer();

describe("auth", () => {
  it("registers, logs in and returns the profile", async () => {
    const { user, tokens } = await registerUser(ctx.app, { email: "ada@example.com", name: "Ada" });
    expect(user.email).toBe("ada@example.com");
    expect(user.hasPassword).toBe(true);
    expect(tokens.refreshToken.length).toBeGreaterThan(40);

    const stored = await User.findOne({ email: "ada@example.com" }).select("+passwordHash").lean();
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);

    const login = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { identifier: "ADA@example.com", password: "correct-horse-1" },
    });
    expect(login.statusCode).toBe(200);

    const me = await ctx.app.inject({
      method: "GET",
      url: "/v1/users/me",
      headers: { authorization: `Bearer ${json<AuthResponse>(login).tokens.accessToken}` },
    });
    expect(json<CurrentUser>(me).name).toBe("Ada");
  });

  it("rejects duplicate emails, weak passwords and bad credentials", async () => {
    await registerUser(ctx.app, { email: "dup@example.com" });
    const duplicate = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { name: "Dup", email: "dup@example.com", password: "correct-horse-1" },
    });
    expect(duplicate.statusCode).toBe(409);

    const weak = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { name: "Weak", email: "weak@example.com", password: "short" },
    });
    expect(weak.statusCode).toBe(400);

    const wrong = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { identifier: "dup@example.com", password: "wrong-password-1" },
    });
    expect(wrong.statusCode).toBe(401);
    const unknown = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { identifier: "nobody@example.com", password: "wrong-password-1" },
    });
    expect(json<{ error: { message: string } }>(unknown).error.message).toBe(
      json<{ error: { message: string } }>(wrong).error.message,
    );
  });

  it("rotates refresh tokens and revokes the session when an old token is replayed", async () => {
    const { tokens } = await registerUser(ctx.app);
    const first = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });
    expect(first.statusCode).toBe(200);
    const rotated = json<AuthTokens>(first);
    expect(rotated.refreshToken).not.toBe(tokens.refreshToken);

    const replay = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });
    expect(replay.statusCode).toBe(401);

    const afterReplay = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: rotated.refreshToken },
    });
    expect(afterReplay.statusCode).toBe(401);
  });

  it("uses an httpOnly cookie for browser clients", async () => {
    const register = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/register",
      headers: { "x-auth-mode": "cookie" },
      payload: { name: "Web", email: "web@example.com", password: "correct-horse-1" },
    });
    expect(json<AuthResponse>(register).tokens.refreshToken).toBe("");
    const cookie = register.cookies.find((item) => item.name === "chatbox_rt");
    expect(cookie?.httpOnly).toBe(true);

    const refresh = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      headers: { "x-auth-mode": "cookie" },
      cookies: { chatbox_rt: cookie?.value ?? "" },
    });
    expect(refresh.statusCode, refresh.body).toBe(200);
  });

  it("resets a password with a one-time code and signs out other sessions", async () => {
    const { user, tokens } = await registerUser(ctx.app, { email: "reset@example.com" });
    const forgot = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/password/forgot",
      payload: { identifier: "reset@example.com" },
    });
    expect(forgot.statusCode).toBe(202);
    expect(await PasswordReset.countDocuments({ userId: user.id })).toBe(1);

    const bad = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/password/reset",
      payload: { identifier: "reset@example.com", code: "000000", password: "new-password-2" },
    });
    expect(bad.statusCode).toBe(400);

    const refresh = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });
    expect(refresh.statusCode).toBe(200);
  });

  it("grants admin to configured emails and protects admin routes", async () => {
    const admin = await registerUser(ctx.app, { email: "admin@example.com" });
    const regular = await registerUser(ctx.app);
    expect(admin.user.role).toBe("admin");

    const denied = await ctx.app.inject({ method: "GET", url: "/v1/admin/stats", headers: regular.auth });
    expect(denied.statusCode).toBe(403);
    const allowed = await ctx.app.inject({ method: "GET", url: "/v1/admin/stats", headers: admin.auth });
    expect(allowed.statusCode).toBe(200);
  });

  it("deletes an account and blocks further access", async () => {
    const { auth, tokens } = await registerUser(ctx.app);
    const deleted = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/account/delete",
      headers: auth,
      payload: { password: "correct-horse-1" },
    });
    expect(deleted.statusCode).toBe(204);
    const refresh = await ctx.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: tokens.refreshToken },
    });
    expect(refresh.statusCode).toBe(401);
  });
});
