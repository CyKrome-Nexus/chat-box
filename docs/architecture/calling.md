# Audio & Video Calling UI and Call Handling

## Overview

This covers the calling **UI and local call-state machine** — outgoing/incoming/active screens,
controls, and call history logging. There is no WebRTC/signaling backend in this repository (that
is the scope of the separate "Production Audio/Video Calling Engine" tickets); until one exists,
`useCallManager` simulates the call lifecycle locally so every screen is real, wired, and
testable today, and only needs its timers/vibration replaced with real signaling events later.

## State

`src/redux/features/callSlice.ts`:

- `state.call.activeCall: IActiveCall | null` — `{ id, contactName, contactAvatar, type: "audio"|"video", direction: "outgoing"|"incoming", status: "ringing"|"active", startedAt, connectedAt? }`.
- `state.call.history: ICallRibbon[]` — the persistent Calls tab list. `endCall` appends an entry
  classified as `OUTGOING`/`INCOMING`/`MISSED` (an incoming call that ends without a
  `connectedAt` is logged as missed).

## `useCallManager`

- `startOutgoingCall(contact, type)` — dispatches `startCall({direction: "outgoing", ...})`,
  navigates to `/call`, and simulates the callee answering after 3 seconds
  (`markCallConnected`) — replace this `setTimeout` with a real "callee accepted" signaling event.
- `simulateIncomingCall(contact, type)` — a **dev-only** affordance for previewing the incoming
  call screen without a second real client/device; a real integration would call this (or
  dispatch `startCall({direction: "incoming"})` directly) from a push notification or signaling
  socket event instead.
- `acceptIncomingCall()` / `hangUp()` — mirror what accepting/ending a real call would do;
  `hangUp` also navigates back off the `/call` screen.

## Screens

`src/app/call.tsx` is a full-screen modal route (`presentation: "fullScreenModal"`) that renders
one of three views from `src/components/calling/` based on `activeCall.status`/`direction`:

- **`OutgoingCallView`** — avatar, name, "Calling…"/"Video calling…", speaker toggle, end call.
- **`IncomingCallView`** — avatar, name, accept/decline buttons. Since no ringtone audio asset
  ships in this repo, `Vibration.vibrate([0, 800, 400], repeat: true)` stands in for a ringtone
  and is cancelled on unmount/accept/decline.
- **`ActiveCallView`** — a live `CallTimer` (counting from `connectedAt`), mute/speaker/end
  controls, plus a flip-camera control and a placeholder self-view tile for video calls (no real
  camera stream without the calling engine).

The hardware back button is swallowed while `/call` is on screen — only the in-screen End Call /
Decline buttons can leave it, matching normal calling-app behavior.

## Trigger Points

`CallRibbon`'s phone/camera buttons and the chat header's (`src/app/messages/_layout.tsx`)
phone/camera icons both call `startOutgoingCall` with that ribbon's/chat's contact info. The Calls
tab (`src/app/(tabs)/calls.tsx`) reads `state.call.history` directly (replacing the previous static
mock array) and has a "Clear" action (`clearCallHistory`) with a confirmation `Alert`.
