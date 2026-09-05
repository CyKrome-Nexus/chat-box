# Offline-First Database Engine & Real-Time Sync

## Overview

Conversations, messages, contacts, and call logs are persisted locally in SQLite
(`src/lib/db/`), so the app's Redux state — and therefore the UI — survives an app restart and
renders from disk before any network round trip, instead of resetting to the hardcoded demo data
on every cold start.

**Why `expo-sqlite` instead of WatermelonDB**: WatermelonDB needs a custom native
config/dev-client and isn't drop-in compatible with this repo's plain Expo managed workflow. The
ticket explicitly allows an `op-sqlite`-style alternative; `expo-sqlite` is the equivalent choice
that works today without introducing a custom native build.

## Schema (`src/lib/db/database.ts`)

- `conversations(id, type, title, avatar_url, unread_count, is_pinned, is_archived, is_muted, draft_text, updated_at)`
- `messages(id, conversation_id, direction, content_type, content, media_url, media_size, duration, status, is_deleted, created_at)`
  — `direction` is `"sender"|"receiver"` (matches `IMessage.type`); `content_type` is
  `"text"|"image"|"video"|"audio"|"document"|"location"` (matches `IAttachment.type`).
- `contacts(id, phone, display_name, username, avatar_url, about, is_registered, source, synced_at)`
- `call_logs(id, contact_name, avatar_url, call_type, call_time, timestamp)`
- `sync_queue(id, conversation_id, message_id, payload, retry_count, next_attempt_at, created_at)`
  — the durable outbox described below.

Each table has a matching repo module (`conversationsRepo.ts`, `messagesRepo.ts`,
`contactsRepo.ts`, `callLogsRepo.ts`, `syncQueueRepo.ts`) exposing typed CRUD functions that
convert between SQL rows and this app's existing `IChatRibbon`/`IMessage`/`IContactRibbon`/
`ICallRibbon` shapes — no other code needs to know it's backed by SQL.

## Startup Hydration (`useOfflineDbSync`)

Mounted once in `AppGate` (`src/app/_layout.tsx`). On the **first ever launch**, the database is
empty, so it seeds itself from the demo data each slice already ships with (the same arrays that
used to be the *only* source of truth). On **every later launch**, the database is non-empty, so
it dispatches `hydrateChats`/`hydrateMessages`/`hydrateManualContacts`/`hydrateCallHistory` to
replace those slices' state with what's actually in SQLite — including everything the user did
last time (messages sent, chats muted/deleted, contacts added, calls made).

## Write-Through Persistence (`persistenceMiddleware`)

A Redux middleware (`src/redux/middleware/persistenceMiddleware.ts`) pattern-matches on specific
action types (`chats/toggleMuteChat`, `messages/composeMessage`, `call/endCall`, etc.), lets the
action reach the reducer first, then mirrors the resulting state into SQLite. The DB write is
fire-and-forget from the UI's perspective — Redux updates and the re-render happen immediately;
disk I/O happens after, so there's no added UI latency for optimistic updates.

## Offline Outbox & Exponential Backoff (`useNetworkSync`)

`messages/composeMessage` with `queued: true` (i.e. sent while offline — see
[Realtime Messaging Infrastructure](./realtime-messaging.md)) also calls
`syncQueueRepo.enqueueSync`, writing the message into the durable `sync_queue` table. Unlike the
in-memory `outboxByConversation` from the realtime-messaging work (which only flushes on a socket
`"online"` transition within the current app session), this table survives a full app restart.

`useNetworkSync` (mounted alongside `useOfflineDbSync`) drains it:

- On every `@react-native-community/netinfo` reconnect event, and every 5 seconds while connected
  (so a queue entry's backoff window can elapse even without a fresh connectivity transition).
- Each due entry (`next_attempt_at <= now`) is retried via the realtime socket client; on success
  it's dequeued and `markMessageFlushed` is dispatched (flipping the UI from a clock to a
  checkmark); on failure `bumpRetry` schedules the next attempt with exponential backoff
  (2s → 4s → 8s → … capped at 60s, `syncQueueRepo.computeNextAttempt`).

## Pending-Message UI

`MessageBubble`'s `StatusTicks` renders a clock icon (`time-outline`) whenever a sent message has
no `status` yet — meaning it's still in the outbox — and swaps to a single/double checkmark once
`status` becomes `"sent"`/`"delivered"`/`"read"`, exactly mirroring the queued → flushed
transition described above.

## Deduplication

Every message keeps the client-generated id it was created with (`${Date.now()}-${random}`) from
compose through to being flushed and re-synced; every DB write uses
`INSERT ... ON CONFLICT(id) DO UPDATE`, so retried/duplicate writes for the same id update the
existing row instead of creating a second one.
