# Telegram-Style Circular Video Notes

Builds on top of [Voice & Audio Messaging](./voice-messages.md) and
[Advanced Voice Note Studio](./voice-note-studio.md) — the mic button's pan gesture, slide-to-
cancel, and swipe-up-to-lock machinery are shared between voice notes and video notes. This
document covers only the video-specific additions.

## Recording (`useVideoNoteRecorder`)

`src/hooks/useVideoNoteRecorder.ts` wraps `expo-camera`'s imperative `CameraView` recording API:

- Requests camera + microphone permissions together (both are required to record a video note).
- `start()` just arms local UI state (a duration timer, `isRecording`) — the actual
  `cameraRef.current.recordAsync({ maxDuration: 60 })` call happens in `beginRecordingOnCamera()`,
  which must be invoked from the mounted `CameraView`'s `onCameraReady` callback. This two-step
  split exists because the camera hardware needs to initialize before `recordAsync` can be called;
  calling it immediately on gesture-begin (before the camera view has mounted/initialized) fails.
- `recordAsync()`'s promise only resolves once `stopRecording()` is called (or the 60s cap is hit),
  so `stop()` stores that promise in a ref at start time, calls `stopRecording()` to trigger it,
  then awaits the stored promise to get the real `{ uri }` result — `stopRecording()`'s own return
  value doesn't carry the file URI.
- Capped at `VIDEO_NOTE_MAX_DURATION_SECONDS = 60`, matching Telegram's video note limit.

## Voice/Video Mode Switcher (`Chat.tsx`'s `micPanGesture`)

The single mic button now drives either recorder depending on `noteMode: 'voice' | 'video'`.
Tapping the button (a short press with negligible movement) toggles `noteMode` instead of sending
a near-zero-length recording:

- `onBegin` always starts the gesture's target recorder immediately (unchanged from the base
  ticket) and stamps a `pressStartRef` timestamp.
- `onEnd` checks elapsed time and total drag distance. If the release happened within 200ms and
  under 10px of movement, it's treated as a tap: whatever recording had just started is discarded
  (`handleCancelForModeSwitch`) and `noteMode` flips. Otherwise the existing slide-to-cancel /
  swipe-up-to-lock / release-to-send logic runs against whichever recorder is active for the
  current mode.
- The mic icon does a 3D flip (`rotateY` on a Reanimated shared value) between a mic glyph and a
  camera glyph whenever `noteMode` changes, so the toggle is visually obvious.

This mirrors the pre-existing voice-note behavior of starting recording on every touch-down
(including plain taps) — a tap already triggered a start-then-immediately-cancel voice recording
before this ticket; video mode inherits the same tradeoff rather than introducing a separate
press-and-hold-delay heuristic.

## Recording UI

- **Dragging** (video mode): `VideoNoteRecordingOverlay` — a circular front-camera preview with an
  SVG progress ring counting up toward the 60s cap — floats above the mic button (absolutely
  positioned within `actionButtonSlot`), while the input row shows a plain "slide to cancel" hint.
- **Locked** (video mode): the overlay persists (with a small lock badge) and the input row swaps
  to a discard (trash) / timer / send row. Unlike voice notes, locked video notes have no
  pause-into-preview step — Telegram's own video notes don't offer mid-recording preview either,
  and reusing `HandsfreeRecordingBar`'s preview player (built around a waveform) isn't a good fit
  for video.

## Playback (`VideoNoteBubble`)

The in-chat bubble (`src/components/messages/VideoNoteBubble.tsx`) uses `expo-video`'s
`useVideoPlayer`:

- Autoplays muted and looping as soon as it's on screen, matching Telegram's silent-autoplay
  behavior for video notes.
- Tapping toggles mute. Unmuting registers with the existing `audioPlaybackManager` single-track
  registry (shared with voice notes) so unmuting one video note or playing one voice note stops
  any other currently-unmuted audio in the app.
- An SVG progress ring around the perimeter tracks `player.addListener("timeUpdate", ...)`.
- Long-press calls `onLongPressFullscreen`, which `AttachmentContent` → `MessageBubble` → `Chat.tsx`
  thread up to open `FullscreenVideoModal` (a simple `expo-video` `VideoView` with native controls).

## Data Model

`IAttachment.type` gained a `"video_note"` variant (`src/interfaces/message-interface.ts`), using
the existing `uri`/`duration`/`uploadProgress` fields — no new fields were needed. `Chat.tsx`'s
`sendAttachmentMessage` sends it through the same simulated-upload-progress path already used for
every other attachment type (there's still no real media upload backend in this repo).

## Known Limitations

- No server-side transcoding/compression — the raw `expo-camera` recording is sent as-is, same
  caveat as the existing image/video/document attachment flow.
- No real upload; `uploadProgress` is a local timer-driven simulation like the other attachment
  types (see [Media Attachments](./media-attachments.md)).
