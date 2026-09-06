# Multi-Account Profile Switching Engine

## Overview

Implements issue #45: up to 5 linked accounts on one device, each with its own SQLite database,
Signal Protocol identity/prekeys, and session — switchable with one tap, with an "Add Account"
flow that logs into or creates a second local account without disturbing the first.

## Why "default" is special

Every storage layer this ticket touches (SQLite database name, SecureStore key names, the session
key) uses the literal account id `"default"` to mean "the original pre-multi-account single-user
case," keeping its exact original, unsuffixed storage key/filename. This is deliberate: an existing
install upgrading to this build has data under `chatbox.db` and `chatbox_e2ee_identity_core_v1` with
no account id anywhere in sight. Treating that existing data as `id: "default"` means upgrading
doesn't silently orphan it — the user's existing chats and encryption identity keep working exactly
as before, and only accounts added after this point get an `acct-<random>`-style id and their own
suffixed storage.

## Storage isolation — the real per-account boundary

Three independent storage layers are each namespaced by "the currently active account id," via the
same pattern in each: a module-level `activeAccountId` variable, a `setActiveXAccount(id)` setter,
and every read/write function building its storage key/filename from that variable instead of a
fixed constant.

1. **SQLite database** (`src/lib/db/database.ts`): `getDatabase()` now resolves
   `chatbox.db` for `"default"` or `chatbox_<accountId>.db` for any other account, caching one
   open `SQLiteDatabase` promise per account id it's seen. **No call site in any of the six
   repo files (`conversationsRepo.ts`, `messagesRepo.ts`, etc.) changed at all** — they all still
   just call `getDatabase()` with no arguments; the account scoping is entirely internal to this
   one module, which is what kept this from being a sprawling refactor across the whole repo.
2. **E2EE identity keystore** (`src/lib/crypto/identityKeyStore.ts`): every SecureStore key
   (`CORE_STORE_KEY`, `OTPK_INDEX_STORE_KEY`, each one-time-prekey's own key) is now a function of
   the active account id, and `ensureIdentity()`'s in-memory cache is a `Map<accountId, IIdentity>`
   instead of a single cached value. This is the literal "separate keystores for each account's
   Signal Protocol identity keys, prekeys, and Double Ratchet state in iOS Keychain/Android
   Keystore" the ticket asks for — `expo-secure-store` already *is* Keychain/Keystore-backed (see
   [e2ee-crypto.md](./e2ee-crypto.md)), so namespacing its keys is a direct, real implementation of
   that requirement, not a simulation of it.
3. **Session** (`src/lib/auth/session.ts`): `saveSession`/`getSession`/`clearSession` all take an
   `accountId` parameter (defaulting to `"default"`), storing under `chatbox:session` or
   `chatbox:session:<accountId>`.

## The accounts registry vs. Redux `accountsSlice`

`src/lib/accounts/accountsRegistry.ts` is the durable, AsyncStorage-backed "table of contents":
`{ accounts: IAccountSummary[], activeAccountId: string }`. `src/redux/features/accountsSlice.ts`
is the in-memory mirror of it that UI components read via `useSelector`. `useAccountRegistrySync.ts`
keeps the active account's entry (name/avatar/handle) in both places up to date as the profile
changes; `useSessionPersistence.ts` loads the registry once at startup, before flipping
`session.status` to `"ready"` — see the next section for why that ordering matters.

`IAccountSummary` carries a `unreadCount` field and a `setAccountUnreadCount` reducer exists, but
nothing calls it yet: since only the *active* account's chats/messages are ever loaded into Redux
(see below), there's no live data to compute an inactive account's unread count from without also
maintaining a background connection to every linked account simultaneously — a materially bigger
change than this ticket's core ask. The field is real, wired-up infrastructure ready for that
follow-up, not a fabricated number.

## Switching accounts

`src/lib/accounts/accountSwitcher.ts`'s `switchActiveAccount(accountId, dispatch)` is the single
entry point, called by the Accounts screen's tap-to-switch and by `logoutUser` (see below). In order:

1. `setActiveDatabaseAccount(accountId)` / `setActiveIdentityAccount(accountId)` — every subsequent
   `getDatabase()`/`ensureIdentity()` call anywhere in the app now resolves against the new account.
2. Persists the new `activeAccountId` to the registry and dispatches it to Redux.
3. Loads the new account's session (`getSession(accountId)`) and dispatches it as `state.user`.
4. Calls `hydrateOfflineDataForActiveAccount` (refactored out of `useOfflineDbSync.ts` so both the
   cold-start hook and this switch path share one implementation) with `seedDemoDataIfEmpty: false`
   — every conversation-list slice (`chats`, `messages`, `contacts`, `call` history) is **fully
   replaced**, not merged, by whatever the target account's own database has (empty, for a brand
   new account) — this is what makes "switching instantly switches database queries" concretely
   true rather than blending two accounts' chats together.

This is the real mechanism behind the ticket's "Switching accounts instantly switches conversation
lists, database queries, and encryption keys" acceptance criterion — each of those three nouns maps
to one of the three storage layers above, all repointed by this one function.

### Cold-start ordering

`useSessionPersistence.ts` reads the registry and calls the two `setActiveXAccount` setters
*before* dispatching `setSessionStatus("ready")`. `useOfflineDbSync.ts` was changed to only run its
hydration effect once `session.status === "ready"` (previously it ran unconditionally on mount).
Without that gate, a cold start where the last-active account wasn't `"default"` could race:
`useOfflineDbSync` might call `getDatabase()` before `useSessionPersistence` finished resolving
which account should be active, loading the wrong (default) database for a moment.

## Account Switcher UI

`src/app/accounts.tsx` — every linked account's avatar/name/handle-or-identifier, a checkmark on
the active one, and a per-row `ActivityIndicator` while a switch is in flight. Long-pressing a row
removes that account (via `logoutUser` if it's the active one, or a direct registry/session
cleanup otherwise — either way its local data stays on disk, only the app stops showing it). The
row transition uses Reanimated's `FadeIn.duration(120)`, under the ticket's "< 150ms" target,
rather than a custom full-screen crossfade — this screen is only ever on/off screen for well under
a second (tap → switch → `router.replace` into the tab navigator), so a heavier bespoke transition
system wasn't worth building for it.

Reached two ways, both existing UI patterns: a new "Accounts" row in the Settings list
(`(tabs)/settings.tsx`), and — matching Telegram's actual gesture — a long-press on the profile
avatar row at the top of that same screen.

## Adding an account

**`src/app/add-account.tsx` is a deliberately separate screen from `(root)/auth.tsx`**, not a mode
flag on it. `(root)/_layout.tsx` redirects to the tab navigator the instant `state.user` is truthy
— exactly the right guard for "already logged in, don't show the login screen again," but it would
make `(root)/auth.tsx` itself impossible to visit while already signed into an account, which is
precisely the situation "Add Account" needs. Reworking that redirect to special-case an "add
account mode" was judged riskier than writing one focused, much smaller screen (login OR sign-up,
no social buttons, no forgot-password) that reuses the same `authService.ts` simulation and the
same `TextInput`/`CountryCodePicker` components, then:

1. Confirms the identifier isn't already one of this device's linked accounts.
2. Generates a new account id and saves the fresh session under it.
3. Adds it to the registry and calls `switchActiveAccount` to make it the new active account.

Enforces `MAX_LINKED_ACCOUNTS = 5` by disabling the form once the limit is hit, in both this screen
and the "Add Account" row on the Accounts screen.

## Logging out

`src/lib/features.ts`'s `logoutUser` is now multi-account-aware: it clears the *active* account's
session and removes it from the registry, then switches to another linked account if one remains
(via `switchActiveAccount`) — Telegram-style, logging out of one account drops you into whichever
other one you have linked rather than the sign-in screen — or falls back to the original
single-account behavior (`router.replace('/')`) if none remain. Both existing call sites
(`(tabs)/settings.tsx`, `settings-account.tsx`'s Delete Account) needed no changes.

## What's out of scope

- **Distinct push tokens per account + tagged "[Work] Alice: …" notifications from inactive
  accounts**: this app has no real push backend to register a token with in the first place (see
  [push-notifications.md](./push-notifications.md)), and more fundamentally, only the *active*
  account's realtime connection is ever open (`useRealtimeConnection(userId)` is called once, for
  whichever account is currently active) — there is no message source for an inactive account to
  notify about. Building this for real would mean maintaining N concurrent realtime connections,
  one per linked account, entirely independent of which one is "active" in the UI — a substantial
  architectural change in its own right, not a small addition on top of this ticket's account-
  isolation work. Left as a follow-up rather than wiring a notification-tap handler to switch
  accounts for a notification type that can't currently be produced.
- **Per-account push token registration**: same reasoning — there's no server to register a token
  with (see [backend-infrastructure.md](./backend-infrastructure.md)).
