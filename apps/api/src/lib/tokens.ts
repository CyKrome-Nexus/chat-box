import { SignJWT, jwtVerify } from "jose";

import type { UserRole } from "@chatbox/shared";

import { env } from "@/config/env";
import { unauthorized } from "./errors";

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ISSUER = "chatbox-api";
const AUDIENCE = "chatbox";

export interface AccessClaims {
  userId: string;
  sessionId: string;
  role: UserRole;
}

export const signAccessToken = async (claims: AccessClaims): Promise<{ token: string; expiresAt: Date }> => {
  const expiresAt = new Date(Date.now() + env.ACCESS_TOKEN_TTL_SECONDS * 1000);
  const token = await new SignJWT({ sid: claims.sessionId, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);
  return { token, expiresAt };
};

export const verifyAccessToken = async (token: string): Promise<AccessClaims> => {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") throw unauthorized();
    return {
      userId: payload.sub,
      sessionId: payload.sid,
      role: payload.role === "admin" ? "admin" : "user",
    };
  } catch {
    throw unauthorized("Session expired, please sign in again");
  }
};
