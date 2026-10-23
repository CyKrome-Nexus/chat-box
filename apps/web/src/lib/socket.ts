import { io, type Socket } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "@chatbox/shared";

import { API_URL, getAccessToken, refreshSession } from "./api";

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ChatSocket | null = null;

export const connectSocket = (): ChatSocket => {
  if (socket) return socket;
  socket = io(API_URL || window.location.origin, {
    transports: ["websocket"],
    // Re-read the token on every (re)connect so rotated access tokens are picked up.
    auth: (callback) => callback({ token: getAccessToken() ?? "" }),
    reconnectionDelay: 500,
    reconnectionDelayMax: 8000,
  });
  socket.on("connect_error", async (error) => {
    if (error.message !== "UNAUTHORIZED") return;
    const token = await refreshSession();
    if (token) socket?.connect();
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
