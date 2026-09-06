# Group Chats, Admin Permissions, Invite Links & Broadcast Lists

## Data Model

`IChatRibbon` (`src/interfaces/list-interface.ts`) gained `isGroup`, `groupDescription`,
`participants: IGroupParticipant[]`, `groupSettings`, `inviteCode`, and (for the separate Broadcast
List feature) `isBroadcast`/`broadcastRecipientIds`. `IGroupParticipant` carries a `role`
(`admin`/`member`) and a `color` — assigned at creation time via `colorForParticipant(index)`
(`chatsSlice.ts`, an 8-color rotating palette), used to color-code each member's name label above
their bubbles in the group. `IMessage` gained matching `senderId`/`senderName`/`senderColor` fields,
set only on `"receiver"`-type messages in a group conversation (the sender's own messages don't need
a label — bubble alignment/color already says "this is you").

Groups are capped at `MAX_GROUP_PARTICIPANTS = 1024` (both `createGroup` and
`addGroupParticipants` slice the list), matching the ticket's stated limit.

## Group Creation Flow

Two steps, two screens, chained via route params (participant selections serialized as JSON,
mirroring how `Chat.tsx` already passes the `user` object through params):

1. `/contact-picker?mode=group` — multi-select over the same combined device+manual contacts list
   the Contacts tab uses (`useDeviceContacts` + `state.contacts.manualContacts`).
2. `/group-create-details` — name (required), description (optional), and an icon picked via
   `expo-image-picker`'s gallery launcher (no camera-capture step here; reusing the full in-app
   camera for a group icon felt like overkill for what's typically a single quick photo pick).
   Dispatches `createGroup`, which adds the creator (`"me"`) as the sole initial admin.

The same `/contact-picker?mode=broadcast` → `/broadcast-create-details` pair creates a Broadcast
List instead (just a name, no icon/description — see below).

## Group Chat Interface

- **Sender name/color**: `MessageBubble.tsx` renders `message.senderName` in `message.senderColor`
  above the bubble text, only for non-sender messages. Since this app has no backend and no other
  real devices ever send a message into any conversation automatically (every existing chat's
  "conversation" is really just the current user typing against static/seeded contact data — see
  [Realtime Messaging](./realtime-messaging.md)), a freshly created group genuinely starts empty;
  there's nothing to seed a demo "other member said something" message from without fabricating a
  conversation that never happened, so none is seeded (unlike the 1-on-1 demo chats, which seed a
  couple of lines specifically because they're pre-existing "existing conversation" ribbons, not
  brand-new ones).
- **`@mention` autocomplete** (`Chat.tsx`): the input's `onChangeText` matches `/@(\w*)$/` against
  the current text; when it matches (and the conversation `isGroup`), a dropdown lists participants
  whose name contains the partial token, capped at 5. Tapping one replaces the trailing `@partial`
  with `@FirstName ` via the same regex. This only detects a mention token at the very end of the
  text (not mid-string edits before the cursor) — good enough for the common "type @ then a name"
  flow without needing to reconcile the `TextInput`'s separate `onSelectionChange` cursor-position
  state on every keystroke.

## Admin Roles & Permissions (`/group-info`)

- Tapping a participant (as an admin, on anyone but yourself) opens an action sheet: Make/Dismiss
  Admin (`setParticipantRole`), Remove from Group (`removeGroupParticipant`).
- **Who can send messages**: an admin-only toggle (`setGroupSetting`, key
  `whoCanSendMessages: "all" | "admins"`). `Chat.tsx` computes `canSendInGroup` from the current
  user's role and this setting, disabling the input (`editable={false}`, placeholder swapped to
  "Only admins can send messages") and short-circuiting `handleSend` when it's false — enforced
  client-side, same as every other permission in this local-only app.
- **Who can edit group info**: the `whoCanEditInfo` field exists on `groupSettings` and gates the
  "add participants" button in `/group-info`, but there's no group name/description/icon *editor*
  screen yet in this pass — `/group-create-details` only handles initial creation. A follow-up
  would add an edit flow reusing the same form gated by this same `canEditInfo` check.
- Admin-approval-for-new-members (`requireAdminApproval`) is modeled on `IGroupSettings` but has no
  UI/enforcement wired up in this pass — flagged rather than silently unfinished.

## Invite Links & QR Codes

`inviteCode` is a random 8-character code generated at group creation (`generateInviteCode()`),
regenerable by an admin (`regenerateInviteCode`, shown as "Reset" in `/group-info`). Two link forms:

- `buildGroupInviteDisplayLink()` → `https://chatbox.link/join/[code]` — the ticket's literal
  format, used for the copyable/shareable text. This domain isn't real; there's no web server or
  App/Universal Links config in this repo to make tapping this URL from outside the app open it.
- `buildGroupInviteDeepLink()` → `chat-box://join/[code]` — the app's own registered `scheme`
  (`app.config.ts`), which **does** work: it resolves to `src/app/join/[code].tsx` via Expo Router's
  automatic deep-link-to-route mapping. The QR code in `/group-info` encodes this deep link (not the
  display URL) so scanning it with this device's own camera app genuinely opens Chatbox to the join
  screen — the acceptance criterion "invite links correctly open the app and join the user to the
  group" is real and testable on-device, just demonstrated via the app's custom scheme rather than a
  production universal-link domain, since standing one up is outside a client-only repo's reach.
- `/join/[code].tsx` looks up the group by `inviteCode`, shows its name/participant count, and on
  "Join Group" dispatches `joinGroupByInviteCode` to add `"me"` as a member — there's obviously no
  second real device using this same link to actually add someone *else*, so multi-user invite
  fan-out isn't demonstrated, only the mechanism itself.

## Broadcast Lists

A Broadcast List (`isBroadcast: true`) is a *send target*, not a shared room — `Chat.tsx`'s
`handleSendBroadcast` (used instead of the normal `sendMessage`/group-send path when
`isBroadcast`) composes one message per recipient directly into each recipient's own individual
1-on-1 conversation, plus a copy into the broadcast list's own conversation id purely so its own
"chat" screen has a visible history of what was sent. Recipients don't see each other or that the
message came from a broadcast — matching WhatsApp's actual broadcast semantics (each contact just
gets a normal-looking direct message).
