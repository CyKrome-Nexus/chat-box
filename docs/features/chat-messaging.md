# Chat & Messaging Documentation

## Overview
Covers real-time chat timelines, message bubble rendering, interactive swipe-to-reply, emoji reactions, message quoting, forwarding, editing (15-minute window), deletion, and full-text search.

## Key Components & Paths
- `src/app/messages/Chat.tsx`: Active conversation screen and timeline.
- `src/components/riboons/ChatRibbon.tsx`: Chat item with swipe-to-mute and swipe-to-delete.
- `src/components/ListDrawer.tsx`: Bottom sheet drawer housing conversation lists.
- `src/components/messages/MessageBubble.tsx`: Sender (accent, right-aligned, tick status) and
  receiver (light background, left-aligned, avatar) bubble rendering.
- `src/components/messages/DateSeparator.tsx`: "Today" / "Yesterday" / date pill separators, plus
  the `getDateLabel` helper used to group messages by calendar day.
- `src/components/messages/EmptyChatState.tsx`: Illustration + copy shown when a conversation has
  no messages yet.
- `src/redux/features/messagesSlice.ts`: Message state, keyed by `conversationId`.

## State Model

Messages live in Redux under `state.messages.byConversation[conversationId]`, an array of
`IMessage` (`src/interfaces/message-interface.ts`). `conversationId` is currently derived from the
chat's `id` (falling back to `name`) as passed through route params from `ChatRibbon`. Sending and
receiving now goes through the realtime layer — see
[Realtime Messaging Infrastructure](../architecture/realtime-messaging.md) for the socket client,
event contract, and offline outbox/flush behavior.

- `useChatRealtime(conversationId, userId).sendMessage(text)`: appends a new sender message
  (`"sent"` if the realtime emit succeeded, unset/queued otherwise).
- `seedConversation({ conversationId, messages })`: only seeds if the conversation is empty; used
  once per opened chat that already has a `lastMessage` preview, so existing conversations show a
  believable two-message backlog (spanning "Yesterday" → "Today" to exercise the date separator)
  while a genuinely new conversation renders `EmptyChatState` instead.

## Rendering an Inverted Timeline

`Chat.tsx` renders the timeline with `FlatList inverted`. Because RN's `inverted` implementation
flips the whole scroll content with `scaleY(-1)`, every row must apply a counter `scaleY(-1)`
transform (see `styles.invertedItem`) or its contents render upside down — this is the standard
gotcha/fix for inverted chat lists, not specific to this codebase. Display data is built once as
`[...messages, dateSeparators].sort(ascending).reverse()` so index 0 is the newest message, which
`inverted` places at the bottom of the screen.

## Chat List Swipe Actions

`ChatRibbon` reveals a mute (bell) and delete (bin) button when swiped left, backed by
`src/redux/features/chatsSlice.ts` (`state.chats.chats`, moved here from the previously-duplicated
mock arrays in `messages.tsx`/`ListDrawer.tsx` — `IChatRibbon` now requires a stable `id` so these
actions can target the right conversation).

- **Mute**: `toggleMuteChat(id)` flips `IChatRibbon.muted`; `ChatRibbon` shows a small
  "notifications-off" glyph next to the name when muted, and the swipe snaps back afterward.
- **Delete**: `bin` shows a native `Alert.alert` confirmation ("Delete conversation with
  [Name]?"). Confirming dispatches `deleteChat(id)`; the ribbon's root is an `Animated.View` with
  `exiting={SlideOutRight}` and the list's other rows use `layout={LinearTransition}`, so the
  removed row slides out and the rest of the list collapses upward smoothly instead of just
  disappearing.
- **Tap-to-close**: tapping the ribbon while it's swiped open (`translateX !== 0`) snaps it back
  to closed instead of navigating into the chat; only a genuine tap while closed opens it.

## Root Reducer Note

`src/redux/store/store.ts` composes `authReducer` (mounted at `state.user`) and `messagesReducer`
(mounted at `state.messages`) via `combineReducers`. `userSlice`'s own state was flattened from
`{ user?: user }` to `user | null` so that `state.user` keeps meaning "the user object itself"
exactly as before this ticket, for every existing `useSelector((state) => state.user)` call site.
