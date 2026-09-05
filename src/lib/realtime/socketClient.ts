import { io, Socket } from "socket.io-client";
import {
    IClientToServerEvents,
    IServerToClientEvents,
    TConnectionStatus,
} from "./types";

type TStatusListener = (status: TConnectionStatus) => void;

/**
 * Thin wrapper around a single socket.io-client connection. Kept as a
 * singleton (rather than per-hook-instance) so every screen shares one
 * connection, one reconnection backoff, and one offline/online status.
 */
class RealtimeSocketClient {
    private socket: Socket<IServerToClientEvents, IClientToServerEvents> | null = null;
    private status: TConnectionStatus = "idle";
    private statusListeners = new Set<TStatusListener>();

    getStatus() {
        return this.status;
    }

    onStatusChange(listener: TStatusListener) {
        this.statusListeners.add(listener);
        return () => this.statusListeners.delete(listener);
    }

    private setStatus(status: TConnectionStatus) {
        this.status = status;
        this.statusListeners.forEach((listener) => listener(status));
    }

    connect(url: string, auth?: Record<string, string>) {
        if (this.socket) return this.socket;

        this.setStatus("connecting");

        this.socket = io(url, {
            auth,
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });

        this.socket.on("connect", () => this.setStatus("online"));
        this.socket.on("disconnect", () => this.setStatus("offline"));
        this.socket.on("connect_error", () => this.setStatus("offline"));

        return this.socket;
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
        this.setStatus("idle");
    }

    emit<E extends keyof IClientToServerEvents>(
        event: E,
        ...args: Parameters<IClientToServerEvents[E]>
    ) {
        if (!this.socket || this.status !== "online") return false;
        this.socket.emit(event, ...args);
        return true;
    }

    on<E extends keyof IServerToClientEvents>(event: E, handler: IServerToClientEvents[E]) {
        this.socket?.on(event as any, handler as any);
    }

    off<E extends keyof IServerToClientEvents>(event: E, handler: IServerToClientEvents[E]) {
        this.socket?.off(event as any, handler as any);
    }
}

export const realtimeSocketClient = new RealtimeSocketClient();
