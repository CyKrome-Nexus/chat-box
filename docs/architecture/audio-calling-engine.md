# Production Audio Calling Engine (CallKit / Telecom / WebRTC)

## Scope & Honesty About What's Real

This ticket asks for a "carrier-grade" calling experience that works foregrounded, backgrounded,
*and terminated*. Several pieces of that fundamentally require infrastructure and credentials that
don't exist in this repository or environment:

| Requirement | Status | Why |
|---|---|---|
| WebRTC peer connection, STUN | ✅ Implemented | Public Google STUN servers need no credentials |
| WebRTC signaling (offer/answer/ICE) | ✅ Implemented, inert by default | Rides on the same realtime socket as messaging (`docs/architecture/realtime-messaging.md`) — no server exists, so it only activates when `EXPO_PUBLIC_REALTIME_URL` is set |
| TURN relay | ⚠️ Configurable, not provisioned | Needs a real (often paid) TURN server; `EXPO_PUBLIC_TURN_URL`/`_USERNAME`/`_CREDENTIAL` env vars are read if set, otherwise omitted — calls across symmetric NATs will fail without one |
| CallKit / Android ConnectionService UI while foregrounded/backgrounded | ✅ Implemented | `react-native-callkeep` needs no external credentials for this part |
| Waking the app from a **terminated** state for an incoming call | ❌ Not implemented | Requires PushKit (iOS) VoIP push certificates and/or FCM, delivered by a backend — no Apple/Google developer credentials or push backend exist here |
| Proximity-sensor earpiece/speaker switching | ✅ Implemented | `react-native-incall-manager`'s `auto: true` mode |
| Call state machine & logging | ✅ Implemented | Local, in `callSlice` + SQLite (`docs/architecture/offline-database.md`) |
| < 1.5s connect time under 4G/5G/WiFi | ❌ Unverifiable | No signaling server or physical devices available to measure this in this environment |

All of the native modules here (`react-native-webrtc`, `react-native-callkeep`,
`react-native-incall-manager`, `@notifee/react-native`) require a custom dev client / EAS build —
none work in Expo Go. Config plugins are registered in `app.config.ts`
(`@config-plugins/react-native-webrtc`, `@config-plugins/react-native-callkeep`), pinned to the
versions documented as compatible with this project's Expo SDK 54
(`react-native-webrtc@124.0.6`-class / plugin `13.0.0`, `react-native-callkeep@4.3.16` / plugin
`12.0.0`).

### `react-native-callkeep` crashed the app on every launch (fixed)

The first time this app was actually built as a real release APK and run on a device — everything
above had only ever been checked with `npx tsc --noEmit`, never a real on-device run — it crashed
on startup, every time, a few seconds after launch. The cause: `react-native-callkeep@4.3.16`'s
Android module exposes two Java overloads each of `displayIncomingCall` and `startCall` annotated
`@ReactMethod` with the same JS-visible name (a 3-arg and a 4-arg version of each). The old bridge
tolerated that; this project's New Architecture (`newArchEnabled: true`, required by
`react-native-reanimated` v4) does not — its TurboModule interop throws
`Unable to parse @ReactMethod annotations ... Module exports two methods to JavaScript with the
same name` the instant *anything* touches the `RNCallKeep` native module object, which
`useCallKeepIntegration.ts`'s setup effect does unconditionally on every app boot. Because the
throw happens synchronously at module-property-access time — not inside the promise `.setup(...)`
returns — the existing `.catch()` on that promise never got a chance to run, so this crashed the
whole JS thread before the app's own React error boundary had even mounted.

Fixed two ways, together:

1. **`patches/react-native-callkeep+4.3.16.patch`** (applied automatically via `patch-package`'s
   `postinstall` script) removes the `@ReactMethod` annotation from the unused 3-arg overload of
   each method — confirmed by reading `react-native-callkeep`'s own `index.js`, which only ever
   calls the 4-arg form on Android. This is the real, root-cause fix.
2. **`useCallKeepIntegration.ts`'s setup effect is now wrapped in `try`/`catch`**, matching the
   pattern its own call-mirroring effect already used, so a similarly-broken or unlinked CallKeep
   module degrades to a no-op instead of crashing the app — defense in depth, not a replacement for
   fix #1, since fix #1 is what actually makes the feature work rather than merely fail safely.

## WebRTC Layer

- **`src/lib/calling/webrtcConfig.ts`** — `getIceServers()`: Google's public STUN servers plus an
  optional TURN entry from env vars.
- **`src/lib/calling/webrtcService.ts`** — `CallPeerConnection`: one `RTCPeerConnection` per call,
  wrapping `getUserMedia`, offer/answer creation, remote SDP/ICE application, mute/video-enable,
  and teardown. (Note: `react-native-webrtc`'s shipped type declarations reference a
  `./vendor/event-target-shim` path that isn't actually included in the published package, so its
  `addEventListener` family is typed as an error there — worked around with a narrowly-scoped
  `as any` on just the listener registrations, not the rest of the file.)
- **Signaling** — `src/lib/realtime/types.ts` gained `call:offer`/`call:answer`/`call:ice-candidate`/`call:end`
  client↔server events, following the exact pattern of the existing message events.

## `useCallEngine`

> [!NOTE]
> As of the video-calling work (`docs/architecture/video-calling.md`), the actual peer connection
> lifecycle moved out of this hook into a `callEngineManager` singleton, so it survives navigating
> away from the `/call` screen (needed for in-app PiP). `useCallEngine` is now a thin binding on
> top of that singleton; the behavior described below is unchanged, just relocated.

Wraps `useCallManager` (the local call-UI state machine from
`docs/architecture/calling.md`) with real signaling, gated on `EXPO_PUBLIC_REALTIME_URL` being
set:

- Not configured (the default in this repo): every method defers entirely to `useCallManager` —
  behavior is identical to before this ticket.
- Configured: `startOutgoingCall` also opens a `CallPeerConnection`, grabs local media, creates an
  SDP offer, and emits `call:offer`; incoming `call:offer`/`call:answer`/`call:ice-candidate`/`call:end`
  events drive the same `activeCall` state via `callSlice`. `acceptIncomingCall`'s answer-creation
  step is left as a documented no-op here since there's no live offer payload cached from a real
  server to answer — wiring that up is mechanical once a signaling server exists (cache the last
  `call:offer` payload, create the answer from it in `acceptIncomingCall`).

## Native Call UI

- **`useCallKeepIntegration`** (mounted once in `AppGate`): configures `react-native-callkeep` and
  mirrors `state.call.activeCall` into native calls — `displayIncomingCall` for incoming,
  `startCall`/`reportConnectingOutgoingCallWithUUID` for outgoing, `setCurrentCallActive` on
  connect, `endCall` when `activeCall` clears. Its own `answerCall`/`endCall` native events
  dispatch back into `callSlice`. All native calls are wrapped in `try/catch` so the app doesn't
  crash if the native module isn't linked (e.g. a dev client built before this feature existed).
- **`useIncomingCallNotification`** (Android only): shows a full-screen-intent Notifee
  notification (`AndroidCategory.CALL`, `fullScreenAction`) with Accept/Decline actions whenever
  `activeCall` is a ringing incoming call, wired back into `callSlice` the same way. This is the
  Android equivalent of CallKit's lock-screen UI. `app.config.ts` declares
  `android.permission.USE_FULL_SCREEN_INTENT` and `POST_NOTIFICATIONS`.

## Audio Routing

**`useCallAudioRouting`** (used in `ActiveCallView`) starts `react-native-incall-manager` for the
lifetime of an active call with `auto: true` — its built-in proximity-sensor handling turns the
screen off and routes to the earpiece when held to the ear, and reverses both when pulled away.
`setSpeakerphoneEnabled`/`setMicrophoneMuted` back the existing Speaker/Mute buttons in
`ActiveCallView` with the real native calls instead of just local UI state.

## What a Real Deployment Still Needs

1. A signaling backend implementing the four `call:*` socket events (or equivalent).
2. A TURN server (e.g. coturn) and its credentials in `EXPO_PUBLIC_TURN_*`.
3. Apple Push Notification service VoIP certificates + a push-sending backend, to wire PushKit
   into CallKeep for terminated-state wake on iOS; the Android equivalent is a high-priority FCM
   data message triggering `useIncomingCallNotification`'s notification from a background handler.
4. An EAS build (or local prebuild) — none of this runs in Expo Go.
