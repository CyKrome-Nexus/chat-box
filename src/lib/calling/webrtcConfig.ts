/**
 * ICE server configuration for NAT traversal. Google's public STUN servers
 * are free and require no credentials, so they're safe defaults for
 * development. A real deployment MUST also configure a TURN server (STUN
 * alone fails to connect calls across symmetric NATs/many carrier-grade
 * NATs) — there is no TURN infrastructure provisioned for this repo, so
 * EXPO_PUBLIC_TURN_URL/_USERNAME/_CREDENTIAL are read from the environment
 * and simply omitted when unset rather than pointing at a fake server.
 */
export const getIceServers = (): RTCIceServer[] => {
    const servers: RTCIceServer[] = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ];

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
