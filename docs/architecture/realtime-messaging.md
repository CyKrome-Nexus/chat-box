# Realtime Messaging Infrastructure

## Overview

Chat message delivery, typing indicators, read receipts, and presence are backed by a
`socket.io-client` connection wrapped in `src/lib/realtime/socketClient.ts`. No backend service
ships in this repository yet — the client is written against a concrete event contract
(`src/lib/realtime/types.ts`) so it can be pointed at a real Socket.IO server as soon as one
exists, and degrades gracefully (queue-and-flush, no crashes, no connection attempts to nowhere)
until then.

## Configuration

Set `EXPO_PUBLIC_REALTIME_URL` (an [Expo public env var](https://docs.expo.dev/guides/environment-variables/))
to the Socket.IO server's URL. When it is unset, `useRealtimeConnection` immediately marks the
connection `"offline"` and never calls `io(...)` — outgoing messages still work, they just queue
locally (see below) until a URL is configured and the app is restarted.

## Event Contract

| Direction | Event | Payload | Purpose |
|---|---|---|---|
| Client → Server | `message:send` | `IMessageSendEvent` | Send a new chat message |
| Client → Server | `typing:update` | `ITypingEvent` | Start/stop typing indicator |
| Client → Server | `receipt:read` | `IReadReceiptEvent` | Acknowledge a message as read |
| Server → Client | `message:receive` | `IMessageReceiveEvent` | Deliver an incoming message |
| Server → Client | `typing:update` | `ITypingEvent` | Someone else started/stopped typing |
| Server → Client | `receipt:read` | `IReadReceiptEvent` | One of my sent messages was read |
| Server → Client | `presence:update` | `IPresenceEvent` | A user went online/offline |

## Pieces

- **`src/lib/realtime/socketClient.ts`** — a singleton wrapping one `socket.io-client` instance
  for the whole app (shared connection/backoff/status), with `connect`, `disconnect`, `emit`
  (returns `false` instead of throwing when not connected), `on`/`off`.
- **`src/redux/features/connectionSlice.ts`** — `state.connection`: overall `status`
  (`idle | connecting | online | offline`), `typingByConversation`, `presenceByUser`.
- **`src/redux/features/messagesSlice.ts`** — extended with an `outboxByConversation` queue.
  `composeMessage` takes a fully-built message plus `queued: boolean`; when `queued`, the message
  id is tracked in the outbox until `markMessageFlushed` removes it.
- **`src/hooks/useRealtimeConnection.ts`** — mount once near the app root (done in
  `src/app/_layout.tsx` via the `RealtimeGate` wrapper). Owns the connection lifecycle, mirrors
  status into Redux, registers the four server→client listeners, and flushes the outbox for every
  conversation as soon as the socket reports `"online"`.
- **`src/hooks/useChatRealtime.ts`** — per-screen hook (used in `Chat.tsx`) exposing
  `sendMessage`, a debounced `notifyTyping` (auto-clears after 3s of inactivity), `markRead`, the
  live `typingUsers` for that conversation, and `connectionStatus`.

## Offline Queue & Reconnection

`socket.io-client` handles the actual reconnection backoff (`reconnection: true`,
`reconnectionDelay` 1s → 10s cap, unlimited attempts). On top of that:

1. `useChatRealtime.sendMessage` always appends the message locally first (optimistic UI). It
   also attempts `realtimeSocketClient.emit(...)`, which only succeeds while `status === "online"`.
2. If the emit failed (offline/connecting), the message is pushed into
   `outboxByConversation[conversationId]` and rendered without tick status.
3. When `useRealtimeConnection` observes the socket transition to `"online"`, it iterates every
   conversation's outbox, re-emits each queued message, and calls `markMessageFlushed` to mark it
   `"sent"` and drop it from the outbox.

## Chat Screen Integration

`Chat.tsx` shows a red banner when `connectionStatus === "offline"` and an italic "X is typing…"
line when `typingUsers` for the open conversation is non-empty. Typing events are fired from the
message `TextInput`'s `onChangeText` via `notifyTyping()`, which itself debounces repeated calls
and auto-emits a "stopped typing" event 3 seconds after the last keystroke or immediately on send.
