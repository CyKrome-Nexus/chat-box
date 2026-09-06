# Global Unique Username System, Public Profile Links & Phone Privacy

## Overview

Implements issue #43. Introduces a public `@handle` distinct from the app's existing login
identifier, a claim/validate/release flow with real-time debounced availability checking, phone
number privacy controls, handle-based public profile links + QR codes + deep links, and an `@`-
prefixed global username search.

## `handle` vs. the existing `username` field

**Important naming clarification**: `IUser.username` (`src/interfaces/user-interface.ts`) already
existed before this ticket and holds the app's *login identifier* (a phone number or email — see
`docs/features/auth-profile.md`) — it's private and used all over the codebase as a fallback id
(`state.user?._id || state.user?.username`). This ticket's `@username` is a **different, new,
optional field: `IUser.handle`.** Renaming the existing `username` field would have touched dozens
of call sites for no benefit; keeping them separate also makes the privacy story simpler to reason
about — `username` (identifier) is never shown to anyone, `handle` (public) is designed to be.

## Format validation & the (simulated) global registry

`src/lib/username/usernameRules.ts` — `validateUsernameFormat()` enforces the ticket's exact rules:
4–32 chars, must start with a letter, only `[A-Za-z0-9_]`, no consecutive underscores.
`usernameKey()` lowercases for case-insensitive uniqueness (`@John_Doe` and `@john_doe` collide).

`src/lib/username/usernameRegistry.ts` — there's no backend to host a real global username
directory (same situation as `src/lib/auth/authService.ts`, which this mirrors), so this simulates
one against AsyncStorage: `checkUsernameAvailability`, `claimUsername` (releases any handle the
user previously held — one handle per user), `releaseUsername`, `lookupByHandle`, `searchUsernames`
(prefix match, powers the search bar). Every function does the exact uniqueness/claim/lookup logic
a real `PUT/GET /usernames/:handle` backend would — swapping AsyncStorage for `fetch()` calls is
the only change a real backend integration would need. **On a single device, this registry can only
ever contain this device's own claimed handle** — there is no second device to claim a colliding or
different handle, so "global" uniqueness is provably correct in the algorithm but not exercised
against real concurrent users in this environment.

## Claiming a username

`src/hooks/useUsernameAvailability.ts` debounces (400ms) input and calls
`checkUsernameAvailability`, returning `idle | checking | available | taken | invalid` — the "real-
time availability checker with debounced backend query" from the spec.

`src/components/settings/UsernameEditor.tsx` is the claim UI: an `@`-prefixed input, live status
(spinner while checking, green check / red X after), and Update/Remove buttons. It's mounted in
**Settings → Edit Profile → Username** (`src/app/profile.tsx`), matching the ticket's exact
location. On successful claim, `onClaimed` dispatches `updateUser({ ...user, handle })`.

## Phone Number Privacy

`settings.privacy` (`src/redux/features/settingsSlice.ts`) gained:

```ts
phoneNumberVisibility: TVisibility;               // "everyone" | "contacts" | "nobody"
discoverableByPhoneNumber: "everyone" | "contacts";
```

Both editable in **Settings → Account → Privacy → Phone Number** (`settings-account.tsx`), reusing
the existing `VisibilityPickerRow` component for the first (identical UI to Last Seen/Profile
Photo/About) and a small two-chip row for the second (no "Nobody" option — the ticket only offers
Everyone/Contacts here).

### What "Nobody" actually hides — concretely

The one real, previously-existing privacy leak this ticket fixes: `src/app/qr-code.tsx`'s public
profile link/QR code used to be built from `user.username` — i.e. **the private login identifier
(phone/email) was being put into a shareable public link and QR code**, regardless of any privacy
setting, because there was no `@handle` concept to use instead. It's now built exclusively from
`user.handle` (`src/lib/profile/profileLink.ts`), and the QR screen shows a "claim a username"
prompt instead of any link/QR at all when the user hasn't claimed one — so the phone number is
never exposed through this surface, independent of `phoneNumberVisibility`, by construction.

`profile.tsx` also shows a live "Phone Number Privacy" summary (`PHONE_VISIBILITY_COPY`) explaining
in plain language what the current setting means, with a shortcut into Settings to change it — a
real, computed-from-state preview, since there's no second device to actually verify "what does
someone else see."

## Public Share Links & QR Codes

`src/lib/profile/profileLink.ts`: `buildProfileLink(handle)` → `https://chatbox.link/@handle`
(primary form). `parseProfileLink()` accepts both that and the ticket's alternate canonical form,
`https://chatbox.me/handle`.

`qr-code.tsx` renders the QR only once a handle exists; `qr-scanner.tsx` now does a real
`lookupByHandle()` registry lookup on scan instead of blindly trusting the scanned text as both a
user id and display name — an unregistered/malformed link now shows a real "not found" alert
instead of silently fabricating a fake contact.

### Deep link route

`src/app/u/[handle].tsx` — reached via `chat-box://u/[handle]` (the app's own custom scheme), the
same honest substitute `join/[code].tsx` uses for group invites: this repo doesn't own the
`chatbox.link`/`chatbox.me` domains, so a real universal-link association (which would let tapping
`https://chatbox.link/@handle` on a device with the app installed open this exact route) can't be
configured here — only the in-app route logic can be built and verified. It looks up the handle via
the registry, shows the resolved profile (name, avatar-less-fallback icon) with a "Start Chat"
button, or a "not a registered username" state.

## Global Username Search

`src/app/search.tsx`: a query starting with `@` switches the results list from the normal chats/
contacts/messages/media search into a dedicated Usernames section backed by
`searchUsernames(query)` (case-insensitive prefix match against the registry). Tapping a result
starts a chat with that user immediately, same as the QR scan flow.

## What's out of scope

- **Group `@mention` autocomplete using real handles**: the group mention picker built in issue #33
  (`messages/Chat.tsx`'s `mentionQuery` state) already autocompletes by participant *name*. Making
  it show `@handle` instead would require every group member to have a real claimed handle visible
  to this device — since the username registry can only ever hold this device's own handle in a
  single-device environment, there's no way to genuinely populate other participants' handles
  without fabricating fake ones. Left as a follow-up for when a real multi-user backend exists.
- **Enforcing `discoverableByPhoneNumber` against another user actually searching for you**: this
  setting is stored and real, but — like `discoverableByPhoneNumber`'s counterpart use case —
  there's no second device attempting to look you up by phone number to block or allow, so there's
  no additional enforcement point beyond the setting itself existing and being honestly described
  in the Privacy screen.
