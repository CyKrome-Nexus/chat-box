# Advanced Voice Note Studio

Builds directly on [Voice & Audio Messaging](./voice-messages.md) — read that first for the base
recording/playback plumbing. This covers the additions: swipe-up-to-lock, live real-sampled
waveform, handsfree controls, and richer in-chat playback.

## Live Waveform Capture

`useVoiceRecorder` now polls `useAudioRecorderState` at `METERING_POLL_MS` (66ms ≈ 15/sec, within
the ticket's 10-20/sec target) and appends each normalized `metering` (dB) reading to a `waveform`
array (capped at 200 samples) for as long as `isRecording` is true — this is a **real** amplitude
capture, not the deterministic placeholder `src/lib/audio/waveform.ts` still generates as a
fallback for messages that don't carry real samples (older recordings, or anything received
without waveform data). `resampleWaveform` bucket-averages a long real capture down to a fixed bar
count for display (`AudioMessageBubble`, `VoicePreviewPlayer`).

## Recording Gestures (`Chat.tsx`'s `micPanGesture`)

The mic button's pan gesture now tracks both axes into `recordingMode`:

- **Hold to record**: unchanged from the base ticket — `onBegin` starts recording immediately.
- **Slide left to cancel**: unchanged — crossing `SLIDE_TO_CANCEL_THRESHOLD` on release discards.
- **Swipe up to lock** (new): crossing `SWIPE_UP_TO_LOCK_THRESHOLD` (80px) up, *without* also
  crossing the cancel threshold, calls `handleLockRecording()` instead of stopping on release —
  recording keeps going and `recordingMode` becomes `"locked"`, swapping the input bar to
  `HandsfreeRecordingBar`. `VoiceRecordingBar` shows a lock icon that scales/translates with the
  live drag distance as visual feedback before release.

## Handsfree Mode & Preview-Before-Send

`HandsfreeRecordingBar` has two sub-states, both reachable only once locked:

- **`locked`**: live waveform + timer + Trash (discard) + a "Pause" button.
- **`preview`**: tapping Pause calls `voiceRecorder.stop()`, which **finalizes** the recording file
  and hands back `{ uri, durationMillis, waveform }`. The bar then shows `VoicePreviewPlayer` (a
  scrubbable mini player over the finalized file) plus Trash and Send.

**Scoping note**: "Pause" here finalizes the recording rather than doing a true pause-then-resume-
with-append. expo-audio's recorder does expose `pause()`/`record()` for genuine pause/resume within
one recording session, but verifying that resuming still produces a single valid, fully playable
audio file (particularly around container/moov-atom finalization for compressed formats) needs
on-device testing this environment can't do. Finalizing on "pause" trades away true resume for a
verified-safe preview-before-send flow, which is arguably the more important half of the
requirement. A future pass with device access could switch this to true pause/resume once
confirmed safe.

## In-Chat Player Enhancements (`AudioMessageBubble`)

- **Real waveform**: renders `resampleWaveform(attachment.waveform, 28)` when the message carries
  real captured samples, falling back to the seeded placeholder otherwise.
- **Scrubbing**: the waveform row is wrapped in a `TouchableOpacity` that measures its own width
  (`onLayout`) and seeks (`player.seekTo(fraction * duration)`) to the tapped fraction.
- **Playback speed**: a `1x`/`1.5x`/`2x` button cycles through `PLAYBACK_SPEEDS` and calls
  `player.setPlaybackRate(rate)`.
- **Continuous playback**: `src/lib/audio/playbackManager.ts` gained a per-conversation sequence
  registry (`registerSequence`, populated by `Chat.tsx` from the conversation's audio-attachment
  messages in chronological order) and a play-handler registry (`registerPlayHandler`, called by
  every mounted `AudioMessageBubble`). When a bubble's player reports `didJustFinish`, it calls
  `playNext(conversationId, messageId)`, which looks up and triggers the next voice note's
  registered play handler — so voice notes in a thread play back-to-back automatically.
