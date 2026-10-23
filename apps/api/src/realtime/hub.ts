import type { Server } from "socket.io";
import type { Types } from "mongoose";

import type { ClientToServerEvents, ServerToClientEvents } from "@chatbox/shared";

export interface SocketData {
  userId: string;
  sessionId: string;
  name: string;
}

export type IoServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

type EventName = keyof ServerToClientEvents;

let io: IoServer | null = null;

export const userRoom = (userId: string | Types.ObjectId): string => `user:${String(userId)}`;
export const sessionRoom = (sessionId: string | Types.ObjectId): string => `session:${String(sessionId)}`;

// Single emit surface so services never touch Socket.IO directly.
export const hub = {
  attach(server: IoServer): void {
    io = server;
  },
  detach(): void {
    io = null;
  },
  toUsers<E extends EventName>(
    userIds: Iterable<string | Types.ObjectId>,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void {
    if (!io) return;
    const rooms = [...new Set([...userIds].map(userRoom))];
    if (rooms.length === 0) return;
    io.to(rooms).emit(event, ...args);
  },
  toSession<E extends EventName>(
    sessionId: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void {
    io?.to(sessionRoom(sessionId)).emit(event, ...args);
  },
  disconnectSession(sessionId: string): void {
    io?.in(sessionRoom(sessionId)).disconnectSockets(true);
  },
  disconnectUser(userId: string): void {
    io?.in(userRoom(userId)).disconnectSockets(true);
  },
};
