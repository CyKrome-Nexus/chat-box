import type { FastifyReply, FastifyRequest } from "fastify";

import { forbidden, unauthorized } from "@/lib/errors";
import { verifyAccessToken, type AccessClaims } from "@/lib/tokens";
import { User } from "@/models/user";

declare module "fastify" {
  interface FastifyRequest {
    auth: AccessClaims | null;
  }
}

export const readBearer = (header: string | undefined): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
};

export const requireAuth = async (request: FastifyRequest): Promise<void> => {
  const token = readBearer(request.headers.authorization);
  if (!token) throw unauthorized();
  request.auth = await verifyAccessToken(token);
};

export const requireAdmin = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  await requireAuth(request);
  const user = await User.findById(request.auth?.userId, { role: 1, disabledAt: 1 }).lean();
  if (!user || user.disabledAt || user.role !== "admin") {
    reply.header("cache-control", "no-store");
    throw forbidden("Admins only");
  }
};

export const authOf = (request: FastifyRequest): AccessClaims => {
  if (!request.auth) throw unauthorized();
  return request.auth;
};
