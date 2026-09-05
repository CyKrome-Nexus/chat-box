# Device Contacts, Search & Start New Chat

## Overview

`src/app/(tabs)/contacts.tsx` merges two sources into one alphabetized, searchable list:

1. **Device contacts** (`src/hooks/useDeviceContacts.ts`) — read via `expo-contacts` after a
   runtime permission prompt.
2. **Manually-added contacts** (`state.contacts.manualContacts`, `contactsSlice`) — entered
   through the "Add Contact" modal opened by the header's `addContact` button.

## "Registered" Status

There's no backend to sync device contacts against yet. `useDeviceContacts` cross-references each
contact's phone number against the local mock auth store
(`authService.findRegisteredIdentifiers`) and sets `isRegistered` accordingly — a stand-in for a
real "which of my contacts are already on Chatbox" backend call, using the same
phone-number-as-identifier scheme `signUp` uses (see `docs/features/auth-profile.md`). Manually
added contacts are always treated as registered (added by phone/username directly by the user).

## Interaction

- **Tap** a registered contact → navigates straight into `Chat` (same route/params shape
  `ChatRibbon` uses). Tapping a non-registered contact opens the profile modal instead of a chat
  that can't exist.
- **Long-press** any contact → `ContactProfileModal` (avatar, name, phone, about) with either a
  "Message" button (registered) or an "Invite to Chatbox" button (not registered — since there's
  no invite-delivery backend, this just confirms the action via `Alert`).
- **Search**: a text field filters the merged list live by name or phone number substring
  (case-insensitive).
- **Add Contact**: the header's `addContact` button dispatches `setShowAddContactModal(true)`;
  `AddContactModal` collects a name and phone/username and dispatches `addManualContact`.
