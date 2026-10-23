# In-App Sound Effects, Haptic Feedback Engine & Custom Notification Tones

## Overview

Implements issue #44: real procedurally-synthesized UI sound effects with proper audio-session
ducking, `expo-haptics` wired into the specific interactions the ticket names at the specific
impact levels it names, and a per-contact custom notification tone/vibration system.

## Sound assets — real, disclosed procedural synthesis

There's no licensed sound-effect library available in this environment. Rather than fabricate
"professional-sounding" audio that doesn't exist, `scripts/generate-sound-effects.js` generates
genuinely real, valid 16-bit PCM WAV files via sine-wave synthesis with attack/decay envelopes
(the same honest-disclosure approach as issue #38's hand-authored `.tgs` stickers): short chirps,
sweeps, and chime sequences shaped to match each effect's description, not raw beeps. Run it with
`node scripts/generate-sound-effects.js` to regenerate `assets/sounds/*.wav` and
`assets/sounds/tones/*.wav`. `.wav` is already in Metro's default `assetExts`, so no bundler
config change was needed (unlike `.tgs` in issue #38).

| File | Effect |
|---|---|
| `message-sent.wav` | Message Sent — soft upward chirp ("swoosh/pop") |
| `message-received.wav` | Message Received — two-note bright chime |
| `voice-note-start.wav` | Voice Note Start — low ping |
| `voice-note-cancel.wav` | Voice Note Cancel — downward sweep ("slide whoosh") |
| `call-ringing.wav` | Call Outgoing Ringing — melodic two-note loop segment |
| `tones/classic.wav`, `chime.wav`, `marimba.wav`, `bell.wav` | Bundled per-contact notification tone library |

## Playback engine & audio session ducking

`src/lib/audio/soundEffects.ts` uses `expo-audio`'s `createAudioPlayer` (not the `useAudioPlayer`
hook — these are one-shot fire-and-forget effects triggered from gesture handlers and Redux event
handlers, not tied to any one component's lifecycle) with one cached player per effect, reset to
`0` and replayed on each call.

**"Never interrupt background music abruptly; use ducking/mixing audio session categories
(`AVAudioSessionCategoryAmbient`)"**: `expo-audio`'s `setAudioModeAsync({ interruptionMode:
"duckOthers" })` is the real, typed, cross-platform equivalent — iOS ducks (lowers, doesn't stop)
whatever's playing in Music/Spotify for the duration of the effect and restores it after, and
Android's audio focus system behaves the same way under `duckOthers`. This is configured once,
lazily, on first sound-effect playback (`ensureAudioMode()`), rather than as a fabricated claim —
it's a real API call with a real, correct effect.

`playSoundEffect(effect)` is gated by `settings.notifications.inAppSounds` (Settings →
Notifications → "In-App Sounds", the ticket's exact toggle) and reads the Redux store directly
(module-level singleton, the same pattern as `callEngineManager.ts`), so any call site — a gesture
callback, a realtime event handler — can fire a sound without being a React component wired up
with `useSelector`.

`startCallRingingLoop()`/`stopCallRingingLoop()` are a separate pair for the outgoing call
screen's ringback tone, since unlike the one-shot effects it needs to keep playing until the call
connects or ends — `player.loop = true` repeats `call-ringing.wav` (including its trailing
silence) for a natural ring-pause-ring cadence. `OutgoingCallView.tsx` starts it on mount and stops
it on unmount, which — since `call.tsx` only renders that view while `status !== "active"` — is
exactly the ringing lifecycle with no extra status checks needed.

### Wired call sites

- **Message Sent**: `messages/Chat.tsx`'s `handleSend`, `handleSendBroadcast`, and
  `sendAttachmentMessage`.
- **Message Received**: `useRealtimeConnection.ts`'s `onMessageReceive`, gated the same way the
  existing in-app banner/push notification already are (skipped for muted chats) — see
  [push-notifications.md](./push-notifications.md).
- **Voice Note Start/Cancel**: `useVoiceRecorder.ts`'s `start()`/`cancel()`.
- **Call Outgoing Ringing**: `OutgoingCallView.tsx` (see above).

## Haptic Feedback Engine

`src/lib/haptics/haptics.ts` wraps `expo-haptics` in four named functions matching the ticket's
exact impact-level mapping, so call sites read as intent rather than picking an
`ImpactFeedbackStyle` from memory:

| Function | Impact | Wired to |
|---|---|---|
| `hapticLightTap` | Light | Tab bar item presses (`(tabs)/_layout.tsx`'s `screenListeners.tabPress`), every `SettingToggleRow` switch (covers every settings toggle app-wide from one place), reaction pill taps (`MessageActionsOverlay.tsx`) |
| `hapticMediumTap` | Medium | Swipe-to-reply threshold reached (`MessageBubble.tsx` — was previously Light; corrected to Medium per spec), long-press context menu reveal (already Medium, unchanged) |
| `hapticWarning` | Notification Warning | Slide-to-cancel voice note crossing its threshold (`messages/Chat.tsx`'s `micPanGesture`, mirroring the same "trigger once per threshold crossing" pattern `MessageBubble.tsx`'s swipe-to-reply already used), delete-message confirmation |
| `hapticSelectionChanged` | Selection | Sticker pack tab switch (`StickerPicker.tsx`), emoji picker category switch (`EmojiPicker.tsx`) |

## Per-Contact Custom Notifications

`settings.customNotifications: Record<conversationId, ICustomNotificationConfig>`
(`src/redux/features/settingsSlice.ts`):

```ts
interface ICustomNotificationConfig {
    messageTone?: string;   // a MESSAGE_TONES key, or a device file:// URI
    callRingtone?: string;  // a CALL_RINGTONES key, or a device file:// URI
    vibrationPattern: "default" | "short" | "long" | "off";
}
```

`src/app/settings-contact-notifications.tsx`, reached from **Contact Info → Custom Notifications**
(`contact-info.tsx`): radio-button lists for the bundled `MESSAGE_TONES`/`CALL_RINGTONES`
libraries (`src/lib/audio/notificationTones.ts`) with a play button to preview each one, a "Choose
from device…" row using `expo-document-picker` (`audio/*` filter — the same picker pattern as
`useAvatarPicker.ts`'s image picker) for a fully custom file, and a four-way vibration pattern
picker with a live haptic preview on selection.

### Where the override is actually applied

- **Incoming message sound**: `useRealtimeConnection.ts`'s `onMessageReceive` checks
  `customNotifications[conversationId]?.messageTone` before falling back to the default
  `messageReceived` effect.
- **Incoming call ringtone + vibration**: `IncomingCallView.tsx` looks up
  `customNotifications[call.contactName]` (calling's signaling layer already keys conversations by
  contact name — see `callEngineManager.ts`) and plays the configured ringtone on a looping
  `expo-audio` player instead of the default, and vibrates with the configured pattern (mapped to a
  real `Vibration.vibrate()` pattern array) instead of the previous hardcoded one.

### What's out of scope

- **Applying the per-contact tone/vibration to the *background push notification* itself**
  (Notifee, when the app isn't foregrounded) isn't wired — `messageNotifications.ts` uses a single
  static Android notification channel for all conversations (see
  [push-notifications.md](./push-notifications.md)). Android's notification system ties
  sound/vibration to a *channel*, not a per-notification override once a channel exists, so doing
  this properly means creating one dynamic channel per conversation with custom notifications
  configured — a real, valid extension of the existing Notifee setup, but a larger, separate change
  to that subsystem's architecture than this ticket's scope, left as a follow-up.
- **Curated licensed ringtones**: same reasoning as issue #42's wallpaper photos — there's no real
  licensed audio library available here, so the bundled tone library is honestly disclosed
  procedural synthesis rather than fabricated-but-implied "professional" sound design.
