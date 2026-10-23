import { io, type Socket } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "@chatbox/shared";

import { API_URL, refreshAccessToken, validAccessToken } from "@/src/lib/api/client";
import type { TConnectionStatus } from "./types";

type TStatusListener = (status: TConnectionStatus) => void;
type TSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// One shared authenticated socket for the whole app.
class RealtimeSocketClient {
    private socket: TSocket | null = null;
    private status: TConnectionStatus = "idle";
    private statusListeners = new Set<TStatusListener>();

    getStatus() {
        return this.status;
    }

    get raw(): TSocket | null {
        return this.socket;
    }

    onStatusChange(listener: TStatusListener) {
        this.statusListeners.add(listener);
        return () => {
            this.statusListeners.delete(listener);
        };
    }

    private setStatus(status: TConnectionStatus) {
        this.status = status;
        this.statusListeners.forEach((listener) => listener(status));
    }

    connect(): TSocket | null {
        if (this.socket) return this.socket;
        if (!API_URL) {
            this.setStatus("offline");
            return null;
        }
        this.setStatus("connecting");

        const socket: TSocket = io(API_URL, {
            transports: ["websocket"],
            auth: (callback) => {
                void validAccessToken().then((token) => callback({ token: token ?? "" }));
            },
            reconnection: true,
            reconnectionDelay: 500,
            reconnectionDelayMax: 10_000,
        });

        socket.on("connect", () => this.setStatus("online"));
        socket.on("disconnect", () => this.setStatus("offline"));
        socket.on("connect_error", async (error) => {
            this.setStatus("offline");
            if (error.message !== "UNAUTHORIZED") return;
            const token = await refreshAccessToken();
            if (token) socket.connect();
        });

        this.socket = socket;
        return socket;
    }

    disconnect() {
        this.socket?.removeAllListeners();
        this.socket?.disconnect();
        this.socket = null;
        this.setStatus("idle");
    }

    emit<E extends keyof ClientToServerEvents>(event: E, ...args: Parameters<ClientToServerEvents[E]>): boolean {
        if (!this.socket || this.status !== "online") return false;
        this.socket.emit(event, ...args);
        return true;
    }

    on<E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]) {
        this.socket?.on(event, handler as never);
    }

    off<E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]) {
        this.socket?.off(event, handler as never);
    }
}

export const realtimeSocketClient = new RealtimeSocketClient();
