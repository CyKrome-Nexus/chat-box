import type { AddressInfo } from "node:net";

import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import mongoose from "mongoose";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, beforeEach } from "vitest";

import type { AuthResponse, ClientToServerEvents, ServerToClientEvents } from "@chatbox/shared";

import { buildApp } from "@/app";
import { connectDatabase } from "@/lib/db";
import { createRealtime } from "@/realtime";
import { hub, type IoServer } from "@/realtime/hub";
import { outbox } from "./outbox";

export interface TestContext {
  app: FastifyInstance;
  io: IoServer;
  url: string;
}

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const setupServer = (): TestContext => {
  const context = {} as TestContext;

  beforeAll(async () => {
    await connectDatabase(process.env.MONGODB_URI ?? "");
    context.app = await buildApp();
    await context.app.listen({ port: 0, host: "127.0.0.1" });
    context.io = createRealtime(context.app.server, []);
    const { port } = context.app.server.address() as AddressInfo;
    context.url = `http://127.0.0.1:${port}`;
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db?.collections();
    await Promise.all((collections ?? []).map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    hub.detach();
    await new Promise<void>((resolve) => context.io.close(() => resolve()));
    await context.app.close();
    await mongoose.disconnect();
  });

  return context;
};

let counter = 0;

export const emailCode = async (app: FastifyInstance, email: string): Promise<string> => {
  const response = await app.inject({ method: "POST", url: "/v1/auth/email/code", payload: { email } });
  if (response.statusCode !== 202) throw new Error(`email code failed: ${response.body}`);
  return outbox.get(email) ?? "";
};

export const registerUser = async (
  app: FastifyInstance,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<AuthResponse & { auth: { authorization: string } }> => {
  counter += 1;
  const email = overrides.email ?? `user${counter}-${Date.now()}@example.com`;
  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/register",
    payload: {
      name: overrides.name ?? `User ${counter}`,
      email,
      password: overrides.password ?? "correct-horse-1",
      code: await emailCode(app, email),
    },
  });
  if (response.statusCode !== 201) throw new Error(`register failed: ${response.body}`);
  const body = response.json<AuthResponse>();
  return { ...body, auth: { authorization: `Bearer ${body.tokens.accessToken}` } };
};

export const json = <T>(response: LightMyRequestResponse): T => response.json<T>();

export const connectSocket = (url: string, token: string): Promise<ClientSocket> =>
  new Promise((resolve, reject) => {
    const socket: ClientSocket = connect(url, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });

export const nextEvent = <E extends keyof ServerToClientEvents>(
  socket: ClientSocket,
  event: E,
  timeoutMs = 3000,
): Promise<Parameters<ServerToClientEvents[E]>[0]> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${String(event)}`)), timeoutMs);
    socket.once(
      event as never,
      ((payload: Parameters<ServerToClientEvents[E]>[0]) => {
        clearTimeout(timer);
        resolve(payload);
      }) as never,
    );
  });
