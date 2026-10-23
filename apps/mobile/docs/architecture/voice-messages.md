# Voice & Audio Messaging

## Overview

Voice messages are recorded with `expo-audio`'s `useAudioRecorder`/`useAudioRecorderState` hooks
and played back per-message with `useAudioPlayer`/`useAudioPlayerStatus`. There is no audio
storage backend in this repo, so a recording's local file `uri` is stored directly on the
message's `attachment` and played back from that same local path.

## Recording: Mic Button, Timer, Slide-to-Cancel

The chat input bar's mic button (`src/app/messages/Chat.tsx`) is a `react-native-gesture-handler`
`Pan` gesture (`minDistance(0)`, so it starts tracking on touch-down rather than after a drag
threshold):

- `onBegin`: starts recording (`useVoiceRecorder().start()`, which requests mic permission first).
- `onUpdate`: tracks negative `translationX` into a shared value (`slideX`), driving both the mic
  button's own `translateX` and the "‹ Slide to cancel" hint's opacity/position in
  `VoiceRecordingBar`.
- `onEnd`: if the drag exceeded `SLIDE_TO_CANCEL_THRESHOLD` (80px) left, the recording is
  discarded (`voiceRecorder.cancel()`); otherwise it's stopped and sent as a new message with an
  `audio` attachment.

While recording, `VoiceRecordingBar` replaces the clip/text-input/sticker row with a red dot,
a live `mm:ss` timer (from `useAudioRecorderState`'s `durationMillis`), and the cancel hint — the
mic button itself stays in place as the drag handle.

## Playback: `AudioMessageBubble`

Each audio message renders its own `AudioMessageBubble` (dispatched to from
`AttachmentContent` by `attachment.type === "audio"`), which owns one `useAudioPlayer` instance
for its file. Play/pause toggles `player.play()`/`player.pause()`; reaching the end seeks back to
0 before replaying.

### Single-Track Playback

`src/lib/audio/playbackManager.ts` is a small singleton: whichever bubble starts playing calls
`setActive(messageId, pauseFn)`, which invokes the previously-active bubble's `pauseFn` first.
Each bubble also calls `clearIfActive` on unmount so a scrolled-away bubble doesn't leave a stale
"active" reference. `useAudioPlayer`'s own lifecycle already releases the underlying player on
unmount, so no extra manual cleanup is needed there.

## Waveform

There's no real amplitude/frequency analysis of the recorded or playing audio here (`expo-audio`
doesn't expose recording-time metering suitable for a bar waveform, and decoding a file for a true
waveform needs infrastructure this repo doesn't have). `src/lib/audio/waveform.ts` generates a
deterministic pseudo-waveform seeded from the message id, so a given voice message always renders
the same bars. `AudioMessageBubble` colors bars up to the current playback progress in the accent
color and the rest dim, giving a scrubber-like visual even though the bars don't reflect the
actual audio.
