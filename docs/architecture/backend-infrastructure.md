# Scalable Backend & Cloud Infrastructure (Specification)

## This Is a Specification, Not an Implementation

`chat-box` is the mobile client repository — there is no server code here, and this ticket asks for
a distributed backend (WebSocket gateway cluster, Redis, PostgreSQL, a global Coturn TURN mesh,
object storage/CDN, Prometheus/Grafana, Sentry). None of that belongs in a React Native/Expo client
codebase; it belongs in a separate backend service repository that doesn't exist yet. What follows
is the precise contract the client already assumes and is built against — every integration point
below is a real, working piece of client code sitting idle behind an environment variable, waiting
for exactly the backend this spec describes. This mirrors `docs/architecture/e2ee-security.md`,
which served the same "spec written before implementation" role for the E2EE ticket before
[e2ee-crypto.md](./e2ee-crypto.md) actually built it.

## What the Client Already Expects, Precisely

| Env var | Read by | Purpose |
|---|---|---|
| `EXPO_PUBLIC_REALTIME_URL` | `useRealtimeConnection.ts`, `callEngineManager.ts` | Socket.io gateway URL. Unset = the app runs fully offline/local (see [Realtime Messaging](./realtime-messaging.md)) — nothing here needs faking, the client already degrades correctly. |
| `EXPO_PUBLIC_TURN_URL` / `_USERNAME` / `_CREDENTIAL` | `webrtcConfig.ts` | Static TURN server config, used only if the dynamic endpoint below isn't set. |
| `EXPO_PUBLIC_TURN_CREDENTIALS_ENDPOINT` | `webrtcConfig.ts`'s `refreshDynamicTurnCredentials()` | An HTTPS endpoint the client `fetch()`s for a fresh `{ urls, username, credential }` bundle before every outgoing call (`callEngineManager.ts`'s `startOutgoingCall`) — this is the client-side half of the ticket's "dynamic short-lived TURN credentials generated via HMAC-SHA1 shared secret." The HMAC-SHA1 generation *has* to happen server-side (embedding the shared secret in a mobile client defeats the purpose of short-lived credentials), so this endpoint is exactly what a Coturn-fronting auth service needs to implement — see the Coturn section below for the expected response shape. |

The Socket.io event contract itself (`src/lib/realtime/types.ts`) is already the wire protocol a
gateway needs to implement — `IClientToServerEvents`/`IServerToClientEvents` list every event
(`message:send`/`message:receive`, `message:edit`, `typing:update`, `receipt:read`,
`presence:update`, `call:offer`/`call:answer`/`call:ice-candidate`/`call:end`) with its exact
payload shape, built independently across [Realtime Messaging](./realtime-messaging.md),
[Production Audio Calling Engine](./audio-calling-engine.md), and
[Message Actions](./message-actions.md) as each ticket needed a new event. A gateway implementing
this contract needs no client changes to start working.

## 1. Distributed WebSocket Gateways

- Stateless Socket.io (or raw WS) gateway nodes behind an ALB/Traefik with either sticky sessions
  (simplest) or a Redis adapter for Socket.io (`@socket.io/redis-adapter`) so any node can reach any
  connected client — required once there's more than one gateway instance, since a message from a
  client on node A to a client on node B needs cross-node delivery.
- **Redis Pub/Sub for cross-node routing**: publish `message:send` events to a channel keyed by
  recipient user id; every gateway subscribes to the channels for its currently-connected users and
  forwards a matching publish to the right local socket.
- **Auth on connect**: the client's `realtimeSocketClient.connect(url, { userId })` (see
  `socketClient.ts`) sends a bare `userId` today, since there's no session/auth token flow wired to
  the realtime layer yet — a production gateway would want a signed session token here instead
  (reusing whatever auth this app's eventual account backend issues — see
  [Social Authentication](./social-auth.md) for the client-side login flows that would need a real
  backend to actually verify against, same "no backend" caveat as everywhere else).

## 2. Persistence & Caching Tier

- **PostgreSQL/CockroachDB**: user identities, **public** prekey bundles (identity key, signed
  prekey + signature, one-time prekey pool — see [e2ee-crypto.md](./e2ee-crypto.md)'s
  `getPublicBundle()`, which already returns exactly the shape a `POST /prekey-bundles` endpoint
  would accept), group metadata, channel subscriptions. **Never** private key material or plaintext
  message content — see the same doc's "zero-knowledge" guarantees this schema needs to preserve.
- **Redis Cluster**: session/socket registries, typing state, presence, rate limiting. The client's
  `connectionSlice.ts` already models typing/presence/status as exactly this kind of ephemeral,
  fast-changing state — a real backend's Redis-backed presence system maps directly onto it.

## 3. WebRTC STUN/TURN Mesh (Coturn)

A real deployment needs Coturn (or an equivalent TURN implementation) running in each target region,
plus a lightweight auth service implementing the HMAC-SHA1 short-lived-credential scheme (RFC-style:
`username = timestamp:client_id`, `credential = base64(HMAC-SHA1(shared_secret, username))`,
typically valid for a few hours) and serving it at whatever URL
`EXPO_PUBLIC_TURN_CREDENTIALS_ENDPOINT` points at, returning:

```json
{ "urls": "turn:region.example.com:3478", "username": "1735689600:chatbox", "credential": "base64-hmac..." }
```

`webrtcConfig.ts`'s `refreshDynamicTurnCredentials()` already fetches and consumes exactly this
shape. [Production Audio Calling Engine](./audio-calling-engine.md) covers everything else the
calling stack still needs from a real signaling server.

## 4. Media Storage & Global CDN

- Presigned-URL direct-to-storage uploads for **ciphertext** media blobs (never plaintext — see
  [E2EE Media Pipeline](./e2ee-media.md), which already implements the client-side AES-256-GCM
  encryption step this storage tier would receive the output of). A real upload endpoint would issue
  a presigned PUT URL; `mediaEncryption.ts`'s `encryptMediaFile()` already produces a ciphertext file
  ready to `PUT` there instead of writing to local cache.
- CDN in front of the object storage bucket, serving the same ciphertext blobs — caching encrypted
  bytes is safe precisely because they're encrypted; the CDN operator never sees plaintext either.

## 5. Observability

Prometheus/Grafana (server-side metrics) and Sentry (crash reporting across both server and this
mobile client) are standard, well-documented integrations with no dependency on anything else in
this spec — the one genuinely "add this to the client" item here, and the one most reasonable to
actually wire into this repo directly rather than only document. Not done in this pass since it's
an unrelated, separate piece of work from the rest of this ticket's backend-architecture scope, and
adding a crash-reporting SDK is a decision usually made deliberately alongside choosing where crash
reports actually get sent — better left to a dedicated follow-up than bundled into a backend spec
document.

## Summary

Everything in this document that's a client-side integration point (the env vars table, the dynamic
TURN credential fetch, the Socket.io event contract, the prekey bundle shape, the ciphertext upload
target) already exists in working, tested TypeScript in this repo. Everything else — the gateway
cluster, Redis, Postgres, Coturn, object storage, CDN, Prometheus/Grafana — is real infrastructure
that has to be stood up in a separate backend project; there is nothing further to build inside
`chat-box` itself for this ticket.
