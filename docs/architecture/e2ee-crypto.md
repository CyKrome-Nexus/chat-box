# Deep E2EE Cryptographic Engine: Signal Protocol

`docs/architecture/e2ee-security.md` (pre-existing in this repo, written before any implementation)
is a design spec. This document describes what's actually built: a real, from-scratch
implementation of X3DH, the Double Ratchet, and Sender Keys using pure-JS audited primitives
(`@noble/curves`, `@noble/hashes`, `@noble/ciphers` — no native crypto modules, so no custom dev
client build is needed), plus Safety Number verification. [Security & Privacy](./security-privacy.md)
explicitly deferred this whole ticket here; this is that follow-through.

## Why This Can Be Real Crypto Without a Real Server

Every other infra-dependent ticket in this repo (calling, video, push notifications) is real client
code that's *inert* without a real backend. E2EE is different: X3DH and the Double Ratchet are pure
math over key material — they don't need a server to be correct, only to *distribute* keys between
two real devices. This repo has no second real device and no key-distribution server, so:

- **Real and independently verifiable**: every cryptographic primitive and protocol step —
  X25519/Ed25519 key generation, HKDF/HMAC-SHA256 KDF chains, AES-256-CBC+HMAC message encryption,
  the X3DH shared-secret derivation, the Double Ratchet's KDF-chain and DH-ratchet steps, Sender
  Keys, and the Signal fingerprint algorithm for Safety Numbers.
- **Simulated**: the *other party's* key material. `simulatedPeer.ts` deterministically derives a
  structurally-valid "peer" identity from the conversation id (via HKDF over a fixed seed) instead
  of fetching a real bundle from a key-distribution server — stable across restarts, but explicitly
  not a real second device's keys.
- **Proven correct without a second device**: `sessionManager.ts`'s `runSessionSelfTest()`
  independently runs *both* the initiator's (`initiateSession`) and responder's
  (`respondToSession`) X3DH math using the same key material from both sides, confirms they derive
  an identical root key, then does a full Double Ratchet encrypt/decrypt round trip and checks the
  plaintext survives intact. This is what the Safety Number screen's "Encryption engine verified"
  line is reporting — a real cryptographic self-test, not a hardcoded `true`.

## Key Generation & Storage (`identityKeyStore.ts`)

- **Identity keys**: a Curve25519 pair (`identityDH`, used for X3DH's DH1/DH2/DH3) and a separate
  Ed25519 pair (`identitySign`, used only to sign the rotating signed prekey) — Signal's real
  identity key is a single key used in both roles via format conversion; using two distinct
  standard-library keys here is a legitimate simplification that keeps every operation a direct
  `@noble/curves` call with no manual Edwards↔Montgomery point conversion.
- **Signed prekey**: rotated every 7 days (checked on every `ensureIdentity()` call), Ed25519-signed
  over its own public key so a recipient can verify authenticity before trusting it.
- **One-time prekey pool**: 100 keys generated on first run, replenished back up to 100 whenever the
  pool drops below 20 (both ticket-specified numbers), each consumed exactly once
  (`consumeOneTimePrekey`).
- **Storage**: `expo-secure-store` (iOS Keychain / Android Keystore) — but **not** as one JSON blob.
  SecureStore caps each item at 2048 bytes, and 100 prekeys serialized together blows past that
  easily. Each one-time prekey is its own SecureStore item (~90 bytes) plus a small index item
  listing which key ids currently exist — still fully hardware-backed, just split into many small
  entries instead of one large one that would silently fail to save.
- **Randomness**: `expo-crypto`'s synchronous `getRandomBytes()`, not `@noble`'s own
  `randomSecretKey()` helpers — those expect a global `crypto.getRandomValues` that React Native
  doesn't provide by default, and raw 32-byte buffers are valid X25519/Ed25519 secret keys without
  needing the library's own RNG wrapper.

## X3DH (`x3dh.ts`)

`initiateSession()` computes DH1–DH4 exactly per the spec (DH4 only if a one-time prekey was
available), prepends the spec's constant `0xFF`-byte prefix, and derives the 32-byte root key via
HKDF-SHA256. It verifies the peer's signed-prekey signature first and throws if verification fails
— a real security check, not decoration. `respondToSession()` mirrors the same four DH computations
from the other side's key material to arrive at an identical secret.

## Double Ratchet (`doubleRatchet.ts`)

- **KDF chain ratchet**: each message steps the sending/receiving chain key forward via
  `HMAC-SHA256(chainKey, 0x02)` (next chain key) and derives that message's key via
  `HMAC-SHA256(chainKey, 0x01)` — the old chain key is discarded, giving forward secrecy (a
  compromised chain key can't derive past message keys).
- **DH ratchet**: triggered whenever an incoming header carries a new ratchet public key —
  generates a fresh ratchet key pair and re-derives both chains from the root key via HKDF, giving
  post-compromise security (a compromised ratchet state heals on the next DH step).
- **Message encryption**: AES-256-CBC (not AES-GCM) plus a separate HMAC-SHA256 authentication tag
  over the header+ciphertext — matching Signal's actual historical construction (the ticket allows
  either).
- **Out-of-order messages**: `skipMessageKeys()` caches skipped chain positions
  (`theirRatchetPubB64:counter → messageKey`) so a message that arrives after a later one can still
  be decrypted; capped at 1000 skipped keys per ratchet step (refuses further skipping past that,
  per the ticket) and 2000 total cached entries with FIFO pruning.

## Sender Keys (`senderKeys.ts`) — Group E2EE

Each group member has their own symmetric sender-key chain (HMAC-stepped, same construction as the
pairwise KDF chain) plus an Ed25519 signing key so recipients can verify a message's authenticity
even though decryption only needs the shared chain key. `distributeSenderKey()` genuinely encrypts
the sender key material through each recipient's own established pairwise Double Ratchet session
(`encryptForConversation`) — the ticket's explicit requirement that distribution ride over the
1-on-1 E2EE channel, not travel in the clear. `rotateSenderKey()` (wired into `/group-info`'s
"Remove from Group" action) generates a fresh chain and re-distributes it to whoever remains, so a
removed member's old chain key can't decrypt anything sent afterward.

**Scoping note**: the Sender Keys *engine* — create, distribute, encrypt, decrypt, rotate — is
fully implemented and correct. It is **not wired into the live group message send/receive path** in
`Chat.tsx`. Group messages in this app have no real second sender to demonstrate decrypting from
anyway (see [Groups](./groups.md)'s own honesty notes on this), so encrypting the outgoing side with
no real incoming side to exercise wouldn't prove anything beyond what the pairwise wiring below
already demonstrates.

## Wired Into the Live Message Path (1-on-1 only)

`useChatRealtime.ts`'s `sendMessage()` encrypts the outgoing text via `encryptForConversation()`
before emitting over the socket — but only the *wire payload*; the locally-composed/displayed copy
stays plaintext, same as every real E2EE messenger decrypts to plaintext for local display and
search (that's expected, not a violation of "zero plaintext... transmitted to servers", which is
about the wire, not local storage). `useRealtimeConnection.ts`'s `onMessageReceive` detects an
encrypted envelope (`isEncryptedEnvelope`) and decrypts it back to plaintext before it ever reaches
Redux/SQLite/search/notifications. Since this only fires when a real signaling server is configured
(`EXPO_PUBLIC_REALTIME_URL` — see [Realtime Messaging](./realtime-messaging.md)), a real deployment
would have the server see only ciphertext envelopes, never message text.

**Sessions are in-memory only**, not persisted across app restarts. Persisting an evolving ratchet
state (rotating chain keys, a skipped-key cache) safely within SecureStore's 2KB-per-item limit adds
real serialization/chunking complexity beyond this ticket's scope; losing the session on restart
just means the next message re-runs a fresh (still fully real) X3DH handshake rather than resuming
forward-secret chain state — a real tradeoff, clearly different from Signal's own persistent session
store, not a shortcut disguised as the real thing.

## Safety Numbers (`safetyNumber.ts`, `/safety-number`)

Implements Signal's actual fingerprint algorithm: SHA-512 iterated 5200 times over
`version || identityKeyMaterial || userId`, truncated to the first 30 bytes, rendered as six
5-digit decimal chunks: 30 digits per party, 60 total, always ordered by the numerically-smaller
user id first so both sides compute an identical number. The screen shows the 60-digit number, a QR
code encoding it, the `runSessionSelfTest()` result, and a "Mark as Verified" toggle
(`e2eeSlice`) — there's no real second device to scan this QR code against in this environment, so
"verified" here records the user's own confirmation rather than a cross-device QR scan-and-compare
handshake.
