# Global & In-Chat Search Engine

## SQLite FTS5 Message Index (`src/lib/db/searchRepo.ts`)

`database.ts`'s migration adds a `messages_fts` FTS5 virtual table (`content`, plus
`message_id`/`conversation_id` as `UNINDEXED` columns so they're stored but not tokenized),
`tokenize = 'porter'` for basic stemming. It's a standalone table synced manually by
`searchRepo.ts` — not an FTS5 "external content" table wired to `messages` via triggers — so every
write path has to explicitly call `indexMessage()`/`removeMessageFromIndex()`; `persistenceMiddleware.ts`
does this for every action that changes a message's text (`composeMessage`, `receiveMessage`,
`editMessage`) or removes one (`deleteMessage`, `deleteForEveryone`). A one-time backfill runs at
first startup after this table is introduced, so pre-existing local messages become searchable too.

`toFtsQuery()` turns free-text input into an FTS5 `MATCH` query by quoting each whitespace-split
token and appending `*` (e.g. `hel` → `"hel"*`), giving prefix/as-you-type matching instead of
requiring whole-word matches, while also neutralizing FTS5's own query operators
(`AND`/`OR`/`-`/`:`) if a user happens to type them literally.

**Fallback**: `searchMessages()` wraps the FTS query in try/catch and falls back to a plain
`LIKE '%query%'` scan over the `messages` table if FTS5 isn't available in the device's bundled
SQLite build, or if the `messages_fts` table/MATCH syntax throws for any other reason — search
still works, just without prefix-matching or FTS ranking. This mirrors this repo's existing
"honesty pattern" of degrading gracefully rather than crashing when a platform capability isn't
guaranteed.

**Also fixed as part of this ticket**: `messagesRepo.ts`'s `upsertMessage` had an
`ON CONFLICT DO UPDATE` clause that only ever updated the `status` column — an edited message's new
text (added in [Message Actions](./message-actions.md)) was silently never persisted to SQLite.
Fixed to update every column on conflict; this was a real pre-existing bug, not something search
introduced, but it directly affected search correctness (an edited message needs to be
re-indexable with its new content) so it's fixed here.

## Global Search (`/search`)

Reached by tapping the search icon in the Home tab header (`(tabs)/_layout.tsx`). A full-screen
modal (`fade` transition) with:

- A debounced (200ms) text input driving `useGlobalSearch()`.
- Filter chips: **Chats**, **Photos**, **Videos**, **Links**, **Audio**, **Documents**. Tapping one
  narrows results to just that category (tap again to clear back to the combined view) —
  `useGlobalSearch` treats **message text search** (via the FTS index) as the "no filter selected"
  default, and the five media chips as separate in-memory scans over
  `state.messages.byConversation` filtered by `IAttachment.type` (or, for Links, by
  `extractUrls()` over message text — reusing the same helper as the
  [shared media gallery](./media-gallery.md)'s Links tab). Chat-name and contact-name/phone
  matching (`useDeviceContacts` + `state.contacts.manualContacts`, same source as the Contacts tab)
  run for every state except when a media chip is active.
- Matched message text and matched chat/contact names render through
  `HighlightedText` (`src/components/search/HighlightedText.tsx`), which splits the string around
  case-insensitive occurrences of the query and applies a highlight style to just the matched
  substring — the "highlighted query substring" requirement.
- Tapping a message or media result navigates to that conversation's `Chat` screen with a
  `jumpToMessageId` param, which `Chat.tsx` picks up on mount to scroll to and briefly flash that
  bubble (reusing the same `jumpToMessage()` helper the quoted-reply tap-to-jump feature from
  [Message Actions](./message-actions.md) uses).

## In-Chat Search

Implemented as an overlay bar `Chat.tsx` renders at the top of its own body (below the offline/
typing banners) rather than literally swapping the native header's title view — toggled via a new
search icon in `messages/_layout.tsx`'s header, which calls `router.setParams({ search: "1" })`;
`Chat.tsx` reads that param to know to show the bar. This achieves the same "search bar in the
conversation view" UX without needing a cross-component state bridge between the parent layout's
static header config and the child screen's search state — the header button and the screen body
communicate purely through the route's own params, the same idiom this codebase already uses for
passing the `user` object into the Chat screen.

- Matching is a simple in-memory scan over the already-loaded `messages` array for this
  conversation (no need for the FTS index here — the conversation's messages are already fully
  resident in Redux, unlike global search which has to look across every conversation).
  Case-insensitive substring match, sorted chronologically.
- The stepper (chevron-up/down) moves `searchMatchIndex` forward/backward (wrapping), and a
  `useEffect` calls `jumpToMessage()` whenever it changes, scrolling to and flashing the matched
  bubble.
- The "X of Y" counter reflects `searchMatchIndex + 1` / `searchMatches.length`.
- Matched substrings inside visible bubbles are highlighted via the same `HighlightedText`
  component, threaded into `MessageBubble` as a new optional `searchQuery` prop.
