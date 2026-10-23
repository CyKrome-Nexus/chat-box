# Biometric App Lock & Privacy Controls

`docs/architecture/e2ee-security.md` (pre-existing in this repo, written before any implementation)
is a design spec for full Signal Protocol E2EE. **This ticket does not implement that** — issue #35
("Signal Protocol E2EE") is dedicated to it, and this repo has no real backend to host X3DH prekey
bundles or relay ciphertext between two real devices in the first place; building the crypto
primitives now would either be disconnected from any real key-exchange flow or duplicate work #35
will need to do properly. What follows here is everything else the ticket asked for that stands on
its own: biometric app lock, granular privacy toggles, and disappearing messages.

## Biometric App Lock (`useAppLock.ts`)

- **Lock trigger**: an `AppState` listener records the timestamp when the app goes to
  `background`/`inactive`; on returning to `active`, if the elapsed time is past the configured
  `autoLockTimeout` (Immediately / 1 min / 15 min / 1 hour — `Settings > Account > Security`), the
  app re-locks. The app also starts locked on a cold launch whenever biometric lock is enabled.
- **Unlocking**: `AppLockScreen` renders full-screen and immediately calls
  `expo-local-authentication`'s `authenticateAsync()` (Face ID / Touch ID / Android BiometricPrompt,
  falling back to device PIN since `disableDeviceFallback: false`). If the device has no biometric
  hardware or nothing enrolled, the lock is skipped entirely rather than stranding the user behind
  a prompt they have no way to pass.
- **Hiding content in the app switcher**: `expo-screen-capture` — `preventScreenCaptureAsync()` sets
  Android's `FLAG_SECURE`, which blanks the recent-apps thumbnail (and blocks screenshots) as a side
  effect; `enableAppSwitcherProtectionAsync()` is the iOS-specific API that blurs the app's content
  in the app switcher and during interruptions. Both are called for as long as biometric lock is
  enabled, and reversed (`allowScreenCaptureAsync` / `disableAppSwitcherProtectionAsync`) when it's
  turned off.

## Privacy Controls (`settings-account.tsx`)

- **Last Seen & Online / Profile Photo / About**: upgraded from plain booleans to a three-way
  `TVisibility` (`everyone` | `contacts` | `nobody`) via a new `VisibilityPickerRow` component,
  stored in `settings.privacy`. `settingsSlice`'s `hydrateSettings` now deep-merges `privacy` (as
  well as `chat` and the new `security` key) on top of the current state rather than replacing it
  wholesale, so a persisted blob saved before this change (with the old boolean `lastSeen` field)
  doesn't crash the UI expecting a string enum — it just falls back to the new defaults for
  whichever sub-keys weren't present.
- **Read Receipts**: still a plain boolean, but it went from decorative to actually wired up —
  `useChatRealtime.ts`'s `markRead()` function existed since [Message Actions](./message-actions.md)
  but was never called anywhere. `Chat.tsx` now calls it for the newest received message whenever
  `privacy.readReceipts` is on (deduped via a ref so it doesn't re-fire every render).
- **Enforcement caveat**: these are genuine preferences with a real effect on this device's own
  behavior (e.g. whether *we* send a read receipt), but there's no backend or second real device in
  this app to actually filter what's shown *to* someone else based on their visibility setting —
  same honesty-pattern caveat as the rest of this repo's infra-dependent features.

## Disappearing Messages

Implemented as a **per-conversation** timer (`IChatRibbon.disappearingTimer`: `off`/`24h`/`7d`/`90d`),
set via a new "Disappearing Messages" row in `/contact-info` (`setDisappearingTimer` in
`chatsSlice`), matching WhatsApp's per-chat model rather than a single global setting:

- `src/lib/security/disappearingMessages.ts`'s `computeExpiresAt()` stamps a new message's
  `IMessage.expiresAt` (send time + the chat's active timer duration) — called from both
  `useChatRealtime.ts`'s `sendMessage` (outgoing text), `Chat.tsx`'s `sendAttachmentMessage`
  (outgoing media), and `useRealtimeConnection.ts`'s `onMessageReceive` (incoming), so a message
  only carries an expiry if the conversation had an active timer *at the moment it was
  created/received* — changing the timer later doesn't retroactively affect already-sent messages,
  matching WhatsApp's actual behavior.
- `useDisappearingMessagesSweep()` (mounted once in `AppGate`) scans every conversation's messages
  every 15 seconds (plus once immediately on startup, to catch anything that expired while the app
  was closed) and dispatches the existing `deleteMessage` reducer for anything past its `expiresAt`
  — which was already write-through-persisted to SQLite (soft-delete + FTS index removal) from the
  [search](./search.md) ticket, so no new persistence logic was needed there.
- **New `expires_at` column**: the `messages` table didn't have one. Since
  `CREATE TABLE IF NOT EXISTS` doesn't add columns to an already-existing table, `database.ts` adds
  it via a guarded `ALTER TABLE ... ADD COLUMN` (SQLite errors if the column already exists, so it's
  wrapped in try/catch) — this is now the established pattern for any future additive column
  migration in this repo, alongside the FTS5 backfill migration from [search](./search.md).
  Without this, a message's expiry would only live in Redux memory and be lost on app restart,
  defeating the "purged from local DB upon expiration" requirement for any message that outlives
  the current app session.
