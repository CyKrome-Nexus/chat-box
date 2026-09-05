# Full-Featured Video Calling (PiP & Group Calls)

Builds directly on [Production Audio Calling Engine](./audio-calling-engine.md) — read that first
for the WebRTC/CallKit foundation and its honest list of what needs real infra/credentials this
repo doesn't have. This doc covers what's specific to video.

## Singleton Call Engine

The actual `RTCPeerConnection` now lives in **`src/lib/calling/callEngineManager.ts`**, a
module-level singleton — not inside the `useCallEngine` hook itself. This matters for the "in-app
PiP" requirement: if the peer connection lived inside a hook only ever called from the `/call`
screen, navigating away from that screen (to browse chats while "minimized") would unmount the
hook and drop the call. `useCallEngine` is now a thin React binding that subscribes to the
manager's remote-stream changes; `CallRibbon`, `messages/_layout.tsx`, and `call.tsx` can each call
it independently and they all observe the same underlying connection.

## Real Camera, Real Controls

- **`src/hooks/useLocalCameraPreview.ts`** — the self-view preview is a real, live local
  `getUserMedia` camera stream, independent of signaling (no network needed for your own camera).
  Camera flip (`_switchCamera()` on the video track) and video enable/disable
  (`track.enabled`) are real, not simulated.
- **`src/components/calling/DraggablePipView.tsx`** — the local self-view is a draggable
  `RTCView` (in-call PiP the ticket asks for: a floating local-preview window you can drag to a
  corner), separate from the app-wide `FloatingCallBubble` minimize feature below.
- **Remote video**: `ActiveCallView` renders the remote peer's stream full-screen via `RTCView`
  when `useCallEngine`'s `remoteStream` is populated (i.e., a real signaling server is configured
  and a peer has connected); otherwise it falls back to the avatar placeholder, same as an audio
  call.
- **Adaptive bitrate** — `src/lib/calling/adaptiveBitrate.ts`'s `AdaptiveBitrateController` polls
  `RTCRtpSender.getStats()` for the outbound video track every 4s and re-scales resolution/bitrate
  across three tiers (720p → 480p → 360p) based on packet loss ratio, using the standard
  `setParameters({ encodings: [...] })` API — this needs no server support, it's a real client-side
  mechanism, started automatically for outgoing video calls.

## In-App PiP: `FloatingCallBubble`

When a call is `active` and the current route isn't `/call`, `src/components/calling/FloatingCallBubble.tsx`
(mounted globally in `AppGate`, above the navigator) renders a small draggable bubble — a live
video thumbnail if the call is video and a remote stream exists, otherwise the contact's avatar —
that reopens `/call` on tap. Because the peer connection lives in the singleton described above,
audio (and video, for whoever's still receiving frames via the manager's stream) keeps flowing
while minimized; this is a real implementation of the ticket's "in-app PiP" requirement.

**System-level PiP** (continuing the call as an OS-managed floating window when switching to a
*different app* entirely, e.g. iOS's `AVPictureInPictureController` / Android's
`enterPictureInPictureMode`) is **not implemented**. That needs additional native modules/config
beyond what's installed here (react-native-webrtc's `RTCView`/`startIOSPIP` helpers cover
video-track PiP on iOS specifically, but wiring a full cross-platform system PiP mode is a
materially separate native integration this pass didn't include) — call this out if a future pass
picks it up.

## Group Video Grid

**`src/components/calling/ParticipantGrid.tsx`** renders a dynamic 1/2/3-column grid (up to 8
tiles) with an active-speaker highlight border, built against a generic `IGridParticipant[]` prop.
There is no SFU (Selective Forwarding Unit) or multi-party signaling backend in this repo — the
current 1:1 offer/answer signaling (`callEngineManager`) only ever produces one remote stream — so
in practice this grid renders at most two tiles today (local + one remote). It's written to take
an arbitrary participant list specifically so that plugging in a real SFU (LiveKit, mediasoup,
etc.) later is a data-plumbing change (populate more `IGridParticipant` entries with real stream
URLs and speaking state) rather than a UI rewrite. Active-speaker detection itself also needs a
real audio-level source (from server-side SFU stats or local per-track audio analysis) that isn't
wired up — `isSpeaking` is a prop the grid already supports, just not yet fed live data.

## Network Transition Handling

`react-native-webrtc`'s ICE restart mechanics handle most WiFi↔cellular transitions automatically
once a `RTCPeerConnection` exists (the OS-level network change triggers ICE renegotiation), but
this hasn't been verified against real devices/networks in this environment — see the acceptance
criteria caveats in `docs/architecture/audio-calling-engine.md`.
