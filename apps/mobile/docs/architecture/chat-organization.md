# Chat Organization & Management (Pinning, Archiving, Unread, Drafts)

## Data Model

`IChatRibbon` (`src/interfaces/list-interface.ts`) gained `pinned`, `archived`, `draft`, and
`isGroup`. `isGroup` is always `false`/`undefined` today — there's no group chat feature yet
(#33) — but the "Groups" filter pill is wired up against it now so it needs no further plumbing
once groups exist. `chatsSlice` gained `togglePinChat`, `toggleArchiveChat`, `setChatDraft`,
`markChatRead`, `markChatUnread`, and `unarchiveChat`, plus `MAX_PINNED_CHATS = 5`.

`notificationCount` (pre-existing) is reused as the unread badge count rather than adding a
separate field — it already drove the ribbon's red dot before this ticket.

## Pinning

`ChatRibbon`'s long-press menu (`Alert.alert`) offers Pin/Unpin. `togglePinChat` refuses to pin a
6th chat once 5 are already pinned (the reducer itself enforces the cap, not just the UI, so a
stale double-tap can't slip past it); `ChatRibbon` also pre-checks the count itself so it can show
an explanatory alert instead of a silent no-op. `(tabs)/messages.tsx`'s `sortChats` puts pinned
chats first, ahead of everything else, regardless of incoming-message activity — pinning never
depends on message recency because there's no global "last activity" timestamp/sort in this app to
begin with (chat order is otherwise just the array's existing order, unchanged by this ticket).

## Archiving

- **Swipe left** on a `ChatRibbon` reveals three actions now instead of two: Mute, **Archive**
  (new), Delete.
- Archived chats disappear from the main inbox list and collect under a collapsible "Archived
  Chats (N)" header (with a summed unread badge) at the top of `(tabs)/messages.tsx` — tapping it
  toggles an inline expand/collapse (`showArchived` state) rather than navigating to a separate
  screen, so it stays a lightweight disclosure rather than another destination.
- **Settings > Chat > "Unarchive on New Message"** (new `settings.chat.unarchiveOnNewMessage`,
  default on) controls whether an incoming message for an archived chat pops it back into the main
  inbox. `useRealtimeConnection.ts`'s `onMessageReceive` checks this setting and dispatches
  `unarchiveChat` conditionally.

## Unread Badges & Filters

- The chat-list filter pills (All / Unread / Groups) live in `(tabs)/messages.tsx`'s
  `FlatList`'s `ListHeaderComponent`. "Groups" is functionally a no-op today (no chat has
  `isGroup: true` yet) but is real, working filter logic waiting on that data.
  "Unread" filters to `notificationCount > 0`.
- The bottom tab bar's Home icon now carries a `tabBarBadge` (native `Tabs.Screen` option) summing
  every chat's `notificationCount` (including archived — a badge total should reflect everything
  actually unread, not just what's currently visible).
- **Mark as Read/Unread** is a long-press action (`markChatRead`/`markChatUnread`) alongside Pin in
  `ChatRibbon`'s `Alert.alert` menu. Opening a chat (`Chat.tsx` mount) also dispatches
  `markChatRead` automatically — the natural "I've seen this" signal.
- `markChatUnread` sets `notificationCount` to at least 1 (there's no real per-message read state
  to "unmark" — it's the same coarse per-chat counter WhatsApp/Telegram's own "mark unread" UI
  drives).

## Drafts

`Chat.tsx` initializes its input `text` state from the conversation's persisted `draft` (lazy
`useState` initializer, so it only applies once on mount and never stomps on what's being typed).
A `textRef` mirrors the latest `text` on every keystroke, and an unmount effect dispatches
`setChatDraft({ chatId, draft: textRef.current })` — using a ref rather than closing over `text`
directly, since the unmount cleanup is registered once (empty dep array) and would otherwise only
ever see the initial (usually empty) string. `ChatRibbon` shows `Draft: {text}` in green in place
of the last-message preview whenever a chat has one, and `sortChats` boosts drafted chats above
non-drafted, non-pinned ones (below pinned chats).

## Persistence

The `conversations` SQLite table already had `is_pinned`, `is_archived`, and `draft_text` columns
from the initial [offline database](../../../../docs/architecture.md) migration — this ticket just wired
`conversationsRepo.ts`'s `upsertConversation`/`listConversations` to actually read/write them, and
extended `persistenceMiddleware.ts` to write through on every new chats-slice action (pin, archive,
draft, mark read/unread, unarchive) plus on `messages/receiveMessage` (since that's what bumps the
unread count). So pin/archive/draft/unread state all survive an app restart, same as everything
else in the offline-first model.
