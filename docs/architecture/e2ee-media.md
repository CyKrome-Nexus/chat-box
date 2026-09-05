# E2EE Encrypted Media Pipeline & Passphrase-Protected Backups

Builds on [Deep E2EE Cryptographic Engine](./e2ee-crypto.md) — read that first for the X3DH/Double
Ratchet engine this media pipeline's key-distribution step would ride over.

## Media Encryption Pipeline (`mediaEncryption.ts`)

Implements the ticket's five steps as real, callable functions operating on real file bytes:

1. **Key generation**: `randomBytes(32)` (256-bit key) + `randomBytes(12)` (96-bit IV) via
   `expo-crypto`'s CSPRNG.
2. **Encryption**: `@noble/ciphers`' `gcm(key, iv).encrypt(plaintext)` — AES-256-GCM, an
   authenticated cipher, so the 128-bit auth tag is embedded in the output and verified
   automatically on decrypt (a tampered/corrupted ciphertext makes `decrypt()` throw, not a
   separate manual tag comparison).
3. **"Ciphertext upload"**: written to a local file under `Paths.cache` — standing in for the
   object-storage blob (Cloudflare R2 / S3) a real deployment would upload to via a presigned URL.
   This repo has no object storage server or upload endpoint, so there's nothing real to upload to;
   the encryption itself, on real file bytes, is real.
4. **Key distribution**: the ticket calls for the media key/IV/hash/tag to travel to the recipient
   packaged inside the message payload, encrypted via the Double Ratchet session — that's exactly
   what already happens for message text in [e2ee-crypto.md](./e2ee-crypto.md)'s wiring
   (`encryptForConversation`/`decryptFromConversation`); an `IEncryptedMediaEnvelope` is
   JSON-serializable, so it would ride the identical path a real deployment's text messages do.
5. **Decryption + verification**: `decryptMediaFile()` reads the ciphertext, GCM-decrypts (auth tag
   check happens here), independently re-hashes the plaintext with SHA-256 and compares it against
   the hash captured at encryption time, and only then writes the verified plaintext to a fresh
   local file.

### Wired Into Every Attachment Send

`Chat.tsx`'s `sendAttachmentMessage` runs every attachment (except location, which has no file)
through a full encrypt → verify-decrypt round trip *before* composing the message — the resulting
`attachment.uri` is the freshly-decrypted, hash-and-tag-verified copy, and `IAttachment` gained a
`mediaEncryptionVerified` flag shown as a small lock badge on image/video bubbles
(`AttachmentContent.tsx`). Since there's no real second device to download the ciphertext blob
from, sender and "recipient" are necessarily the same device in this demo, so the round trip
happens transparently on the sender's own copy — this still genuinely exercises real AES-256-GCM
encryption + SHA-256 verification on every real attachment sent, not a stub. If encryption fails for
any reason, the attachment still sends with its original plaintext uri rather than blocking the
message — a media-pipeline bug shouldn't be able to stop messaging entirely.

## Encrypted Cloud Backup & Restore (`encryptedBackup.ts`)

- **Key derivation**: **PBKDF2-SHA256 substitutes for the ticket's specified Argon2id.** Argon2id
  needs either a native module (no custom dev client build available/verifiable in this
  environment — the same constraint that ruled out `react-native-vision-camera` and
  `libsignal-client` elsewhere in this repo) or a WASM implementation (React Native's Hermes engine
  doesn't support WebAssembly, ruling out the usual JS Argon2id libraries). 210,000 PBKDF2-SHA256
  iterations (OWASP's 2023 recommendation for password-based key derivation) is a real, still-
  standard alternative — not memory-hard like Argon2id, so more GPU-parallelizable to brute-force,
  which is the concrete security property being traded away by this substitution.
- **Bundle contents**: every conversation, all messages, manual contacts, and call history — read
  straight from the existing SQLite repos ([Offline Database](./offline-database.md)). **Media
  files themselves are not bundled** — only their local file uris/metadata travel with a message,
  so a restore on a fresh install recovers full chat history/text but reattaches to whatever local
  media that new device happens to have (i.e., none, on a truly fresh install). Bundling actual
  attachment bytes is a meaningful scope increase (copying every file, managing bundle size) this
  pass didn't take on.
- **Encryption**: AES-256-GCM with the PBKDF2-derived key, a random 128-bit salt, and a random
  96-bit IV, written as one JSON file (`{version, salt, iv, ciphertext}`) — no compression, since
  adding a compression library was its own scope decision not taken here.
- **"Upload to Google Drive / iCloud"**: rather than a direct Google Drive/iCloud API integration
  (which needs real OAuth credentials/entitlements this environment has none of), the encrypted
  backup file is handed to the OS share sheet (`expo-sharing`) — iOS's share sheet includes "Save to
  Files" → iCloud Drive, and Android's includes any installed cloud app (Google Drive among them).
  This is a real, working mechanism for getting an encrypted backup into the user's actual cloud
  storage, just via the OS's own save flow instead of a bespoke API client.
- **Restore**: `expo-document-picker` lets the user pick the backup file back (from Files/Drive/
  wherever they saved it), a passphrase prompt (`PassphraseModal.tsx` — RN has no cross-platform
  `Alert.prompt`) decrypts it, and the result is dispatched into every relevant Redux slice
  (`hydrateChats`/`hydrateMessages`/`hydrateManualContacts`/`hydrateCallHistory`) **and**
  write-through persisted to SQLite (`persistRestoredBackup`) so the restore survives the next app
  restart too, matching this app's existing write-through model everywhere else. A wrong passphrase
  or corrupted file makes the GCM decrypt throw, surfaced as a clear "Restore failed" alert.
