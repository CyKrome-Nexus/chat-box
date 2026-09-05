# Message Actions Menu (Reactions, Quoted Replies, Forwarding, Editing, Deletion)

## Long-Press Context Menu (`MessageActionsOverlay.tsx`)

`MessageBubble.tsx` combines its existing swipe-to-reply `Gesture.Pan()` with a new
`Gesture.LongPress()` (350ms) via `Gesture.Race(longPressGesture, swipeGesture)` — whichever
activates first wins, so a still, held press opens the menu while a drag still swipes-to-reply.
On activation it fires a medium haptic and calls `measureInWindow()` on the bubble's row `View` to
get its exact on-screen position, then hands `{ message, anchor }` up to `Chat.tsx`.

`MessageActionsOverlay` renders as a `Modal` (dims everything behind it) containing:

- A **static preview** of the tapped bubble's content, redrawn (not the live interactive
  `MessageBubble`) at the measured `anchor` position/size, so it visually "elevates" above the dim
  backdrop without re-running any of the bubble's own gesture handlers inside the modal.
- The **quick-reaction pill** (👍 ❤️ 😂 😮 😢 🙏 + a "+" button opening the full `EmojiPicker` for
  any emoji) positioned above or below the bubble depending on available screen space.
- The **action menu** (Reply/Copy/Forward/Edit/Star/Delete/Info), also flipped above/below to stay
  on-screen, with its item list computed dynamically per message: Copy only appears for text
  messages, Edit only within `EDIT_WINDOW_MS` (15 minutes) and only for the sender's own **text**
  messages (not attachments — see Editing below), Info only for the sender's own messages.

One reactor, one reaction: `IMessage.reaction` is a single optional emoji string, not a
per-user map — this is a single-account chat simulation with no multi-user reaction aggregation to
model. Tapping the same quick-reaction again clears it (`setMessageReaction` toggles).

## Quoted Replies That Jump to the Original

`IMessage.replyTo` gained a `messageId` field (previously just a text/sender snapshot). The
in-bubble reply quote is now a `TouchableOpacity` that calls `onPressReplyQuote(messageId)`, which
`Chat.tsx` resolves to an index in `displayData` and scrolls the (inverted) `FlatList` to it via
`scrollToIndex` (with an `onScrollToIndexFailed` retry, since message bubbles are variable-height
and there's no `getItemLayout`), then briefly flashes the target bubble via a
`highlightedMessageId` state consumed by `MessageBubble`'s `highlighted` prop.

## Editing

- Restricted to the sender's own **text-only** messages within 15 minutes
  (`EDIT_WINDOW_MS` in `MessageActionsOverlay.tsx`) — attachments aren't editable here, matching
  WhatsApp/Telegram (you can edit a caption's text in some clients, but this app's caption is
  already stored as the message's `text` field, and editing an attachment message's caption would
  need `AttachmentContent` to keep rendering while editing; scoped out for this ticket).
- Selecting "Edit" populates the input bar with the message's current text and shows an "Editing
  message" banner (replacing the reply banner) instead of composing a new message.
- Sending calls a new `editMessage(messageId, text)` from `useChatRealtime`, which dispatches the
  `editMessage` reducer (sets `text`, `edited: true`, `editedAt`) **and** emits a `message:edit`
  event over the realtime socket. `useRealtimeConnection.ts` listens for the same event and applies
  the identical reducer — so if a real signaling server existed and relayed this event to the other
  participant's client, their copy would update to match, live. Without
  `EXPO_PUBLIC_REALTIME_URL` configured (the default in this environment, see
  [Realtime Messaging](./realtime-messaging.md)), the emit is a no-op and only the local optimistic
  update applies — same honesty-pattern caveat as every other realtime feature in this repo.
- `MessageBubble` shows an "edited" label next to the timestamp when `message.edited` is set.

## Delete for Me vs. Delete for Everyone

- **Delete for Me** (`deleteMessage` reducer, already existed from the [media
  gallery](./media-gallery.md) lightbox) removes the message from local state outright.
- **Delete for Everyone** (new `deleteForEveryone` reducer) only appears as an option within the
  same 15-minute window, for the sender's own messages, and instead of removing the row it clears
  `text`/`attachment`/`reaction` and sets `deletedForEveryone: true` — `MessageBubble` renders that
  as an italic "This message was deleted" tombstone. There's no server to actually notify a
  recipient's device, so "for everyone" here means "everyone who shares this same local
  `byConversation` state" — i.e., honest about being a client-only simulation, same as the rest of
  this app's messaging layer.

## Star / Bookmark

`toggleStarMessage` flips `IMessage.starred`. `/starred-messages` (linked from Settings > Chat) is
a new screen that scans every conversation's messages for `starred: true` and lists them
newest-first, resolving each one's chat name via `state.chats.chats`; tapping a row opens that
conversation.

## Forward

Reuses `ForwardSheet` (built for the [media lightbox](./media-gallery.md)'s Forward action) as a
general-purpose "pick a destination chat" picker, now also wired into the message actions menu —
`Chat.tsx`'s `handleForwardSelect` composes a new message (same text/attachment, stripped of
reply/star/edited/reaction state) directly into the target conversation's local state.

## Message Info

`MessageInfoModal` shows Sent / Delivered / Read timestamps for the sender's own messages.
`updateMessageStatus` now stamps `deliveredAt`/`readAt` the first time a message's status reaches
that stage. Since this app has no backend that ever actually marks a message delivered (see
[Realtime Messaging](./realtime-messaging.md) — `receipt:read` only fires from a real server that
doesn't exist here), `Chat.tsx` adds `simulateDeliveryReceipt()`: after composing an outgoing
message, it locally dispatches `"delivered"` after 800ms and `"read"` after 2.5s. This is a
client-side simulation for demo purposes (consistent with the simulated upload-progress bars used
elsewhere), not a real receipt from another device — Info reports whatever these simulated (or, if
a real server is configured, genuinely server-driven) timestamps say.
