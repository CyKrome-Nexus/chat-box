import type { IceServer } from "@chatbox/shared";

import { callsApi } from "@/src/lib/api/services";

const FALLBACK: IceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

let cached: { servers: IceServer[]; expiresAt: number } | null = null;

// Short-lived TURN credentials come from the API; refreshed well before they expire.
export const loadIceServers = async (): Promise<IceServer[]> => {
    if (cached && cached.expiresAt > Date.now()) return cached.servers;
    try {
        const config = await callsApi.iceServers();
        cached = { servers: config.iceServers.length ? config.iceServers : FALLBACK, expiresAt: Date.now() + (config.ttlSeconds * 1000) / 2 };
    } catch {
        cached = { servers: FALLBACK, expiresAt: Date.now() + 60_000 };
    }
    return cached.servers;
};

export const getIceServers = (): IceServer[] => cached?.servers ?? FALLBACK;
