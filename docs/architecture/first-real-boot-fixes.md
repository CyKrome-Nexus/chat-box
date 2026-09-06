# First Real-Device Boot: Four Latent Bugs Found and Fixed

## Context

Every ticket in this repository's history was verified with `npx tsc --noEmit` only — a type
check, never an actual app launch. The first time this app was ever installed and run as a real
release build (building `pnpm run build:android:apk`/`:split` after fixing the Gradle Metaspace
build failure — see the PR history around that fix), it failed to progress past the splash screen,
then crashed outright once earlier fixes let it get further. Four independent, previously-dormant
bugs were found and fixed by working through the failure chain one layer at a time, each confirmed
against real `adb logcat`/`dumpsys` output and a real installed APK — not by inspection alone.

## Bug 1: `react-native-callkeep` crashed the app on every launch

Covered in full in [audio-calling-engine.md](./audio-calling-engine.md#react-native-callkeep-crashed-the-app-on-every-launch-fixed).
Two Java method overloads shared a JS-exposed name, which the New Architecture's TurboModule
interop rejects. Fixed with a `patch-package` patch plus a defensive `try`/`catch`.

## Bug 2: `useCallKeepIntegration` requested real permissions before login, blocking the first frame

Even after Bug 1's crash was fixed, the app's very first frame never drew
(`dumpsys window windows` showed `MainActivity`'s own window stuck at `mDrawState=DRAW_PENDING`,
`shown=false`, while a real Android `GrantPermissionsActivity` briefly took focus). `RNCallKeep.setup({ android: { selfManaged: true } })` registers a real Android `PhoneAccount` and can trigger a
real system permission dialog — and it ran unconditionally the instant `_layout.tsx`'s `AppGate`
mounted, before the splash screen even cleared and before anyone had signed in.

**Fix**: `useCallKeepIntegration` now takes an `enabled` parameter; `AppGate` passes `!!userId`, so
setup is deferred until a user is actually signed in — the same gating point `useRealtimeConnection`
already used for opening a real socket connection, for the identical reason.

## Bug 3: An invalid SecureStore key silently blocked login forever

With Bug 2 fixed, the app still never got past the splash screen — `session.status` never reached
`"ready"`. Bisecting with temporary `console.log` statements through `_layout.tsx` and
`useSessionPersistence.ts` (confirmed via `adb logcat`, which showed clean progress up to "about to
read session" and then nothing) found the actual exception, previously swallowed by an
un-awaited, uncaught async effect:

```
Error: Invalid key provided to SecureStore. Keys must not be empty and contain only
alphanumeric characters, ".", "-", and "_".
```

`src/lib/auth/session.ts`'s `sessionKey()` built keys like `chatbox:session` — a colon, which
`expo-secure-store` (Keychain/Keystore-backed) has never accepted. This key predates this session's
work entirely; it simply had never been exercised for real before.

**Fix, two parts**:
1. Renamed the key to `chatbox.session` (and `chatbox.session.<accountId>` for linked accounts) —
   valid characters only, no migration needed since no real install had ever successfully written
   under the old key.
2. `useSessionPersistence`'s startup effect is now wrapped in `try`/`catch`/`finally`, always
   dispatching `session.status = "ready"` (falling back to a logged-out state on any storage
   failure) instead of leaving the app permanently stuck behind the splash screen if a future
   storage read ever throws for any reason. This is the actual general fix — the specific colon bug
   is also fixed directly, but the app should never again be able to hang forever here regardless of
   cause.

## Bug 4: Google Sign-In's auth hook crashed on Android with no configured client ID

With Bugs 1–3 fixed, the app reached the real login screen — then crashed immediately with
`Client Id property 'androidClientId' must be defined to use Google auth on this platform`, thrown
from inside `expo-auth-session`'s `Google.useIdTokenAuthRequest` hook itself, on every render,
regardless of whether the user ever tapped the Google button.

`useSocialAuth.ts` already had the right idea for Facebook — a `clientId: ... || "unconfigured"`
fallback so the hook's internal invariant check passes even with no real OAuth credentials
configured (see that file's original comment: "no real OAuth app credentials configured in this
repo... prompting Google/Facebook surfaces a clear 'not configured' message instead"). The Google
request was just missing the equivalent fallback — an inconsistency between the two providers in
the same file, not a different fix in kind.

**Fix**: added the same `clientId: <real client id> || "unconfigured"` fallback to the Google
request config. `googleConfigured` (unchanged) still correctly gates the actual sign-in prompt
button — this only stops the hook itself from throwing during render.

## Bug 5: An infinite redirect loop in `(root)/_layout.tsx`

With all of the above fixed, the app crashed once more — `Maximum update depth exceeded` inside
`RootLayout`. That layout's effect called `router.replace("/")` whenever `user` was falsy; while
already logged out and already on `/root/index` (which resolves to `/`), replacing to the route
already active retriggers Expo Router's navigation state, remounting the layout and re-running the
same effect — forever.

**Fix, and a fix to the first fix**: the initial attempt added `pathname` to the effect's dependency
array to guard the redundant replace. That introduced a *worse* bug: navigating to `/auth` or
`/forgot-password` while still logged out (completely normal — nothing about auth state changed)
re-ran the effect and immediately bounced back to `/`, making those screens permanently
unreachable. Confirmed on-device: tapping "Sign up with Phone" appeared to do nothing.

The correct fix keeps the effect's dependency array as `[user]` only — it should re-run when auth
state changes, not on every in-group navigation — while still reading the current `pathname` inside
the effect body (intentionally not a dependency) purely to skip the redundant self-replace that
caused the original loop. Verified on-device: the welcome screen, sign-up form (all fields,
including the previously-crashing Google button), and forgot-password screen all render and
navigate correctly with no crash and no loop.

## Verification method

Every fix in this document was confirmed against a real installed release APK on a physical
device via `adb logcat`, `adb shell dumpsys window windows`, and `adb exec-out screencap` —
screenshots of the actual rendered welcome screen and sign-up form are what confirmed the fixes
worked, not just an absence of `tsc` errors. `npx tsc --noEmit` remained clean throughout, which is
itself the point of this document: type-checking cleanly was never evidence these code paths
actually worked.
