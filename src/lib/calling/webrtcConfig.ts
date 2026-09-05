/**
 * ICE server configuration for NAT traversal. Google's public STUN servers
 * are free and require no credentials, so they're safe defaults for
 * development. A real deployment MUST also configure a TURN server (STUN
 * alone fails to connect calls across symmetric NATs/many carrier-grade
 * NATs) — there is no Coturn cluster provisioned for this repo (see
 * docs/architecture/backend-infrastructure.md), so static
 * EXPO_PUBLIC_TURN_URL/_USERNAME/_CREDENTIAL env vars are the fallback, and
 * are simply omitted when unset rather than pointing at a fake server.
 */
let dynamicTurnServer: RTCIceServer | null = null;

/**
 * The ticket's "dynamic short-lived TURN credentials generated via
 * HMAC-SHA1 shared secret" — that generation has to happen server-side (the
 * shared secret can't be embedded in a mobile client without defeating the
 * point of short-lived credentials), so this is the client-side half: if
 * `EXPO_PUBLIC_TURN_CREDENTIALS_ENDPOINT` is configured, fetch a fresh
 * `{ urls, username, credential }` bundle from it before starting a call.
 * Call this before constructing a `CallPeerConnection` (see
 * `callEngineManager.ts`'s `startOutgoingCall`) — `getIceServers()` reads
 * from the cache this populates. Silently no-ops (keeping whatever static
 * config exists) if the endpoint isn't configured or the fetch fails.
 */
export const refreshDynamicTurnCredentials = async (): Promise<void> => {
    const endpoint = process.env.EXPO_PUBLIC_TURN_CREDENTIALS_ENDPOINT;
    if (!endpoint) return;

    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        if (data?.urls && data?.username && data?.credential) {
            dynamicTurnServer = { urls: data.urls, username: data.username, credential: data.credential };
        }
    } catch {
        // Endpoint unreachable/misconfigured — fall back to static config below.
    }
};

export const getIceServers = (): RTCIceServer[] => {
    const servers: RTCIceServer[] = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ];

    if (dynamicTurnServer) {
        servers.push(dynamicTurnServer);
        return servers;
    }

    const turnUrl = process.env.EXPO_PUBLIC_TURN_URL;
    if (turnUrl) {
        servers.push({
            urls: turnUrl,
            username: process.env.EXPO_PUBLIC_TURN_USERNAME,
            credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
        });
    }

    return servers;
};
