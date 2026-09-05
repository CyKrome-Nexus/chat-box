# Zero-Knowledge Encrypted Push Notifications

## Read This First: The Honesty Boundary Is Different Here

Every other infra-dependent ticket in this repo (calling, push badging/actions, backend-hosted
E2EE key distribution) is real client-side TypeScript/React Native code that's *inert* without a
real backend — the code is genuinely correct, it just has nothing live to talk to. **This ticket is
different.** Its core deliverable — an iOS Notification Service Extension and an Android background
FCM decryptor — is **native platform code that runs outside the React Native JS engine entirely**,
requires a native build toolchain (Xcode + a real Apple Developer account for the NSE's App Group
entitlement and provisioning; Android Studio/Gradle + a real Firebase project for the FCM service),
and needs `expo prebuild` to eject from this Expo-managed project into a native `ios/`/`android/`
project that doesn't currently exist in this repo. **None of that exists in this sandboxed,
non-macOS environment**, and unlike a missing server URL, there's no way to write TypeScript that
makes it real — Swift and Kotlin native extension code has to be written, compiled, and run by a
platform this environment cannot access.

This is the most honest thing to say about this ticket: rather than fabricate config that looks
like it works, or claim a native extension was "implemented" when it can't be compiled or verified
here, this pass delivers exactly what genuinely can be built and verified in this environment, and
documents the rest precisely enough that a developer with Xcode/Android Studio access could finish
it.

## What's Real

- **`encryptedPushPayload.ts`**: the exact wire payload contract from the ticket
  (`recipient_id`/`session_id`/`encrypted_payload`/`nonce`/`collapse_key`) as TypeScript types, plus
  `buildEncryptedPushPayload()` (what a real server would call) and `isEncryptedPushPayload()` (a
  runtime type guard). Small, but it's the one piece of "the payload contains zero plaintext" that's
  actually expressible as portable code rather than a platform-specific extension.
- **Encrypted quick reply, for the JS-reachable case**: `useMessageNotifications.ts`'s Reply handler
  (from [Push Notifications](./push-notifications.md)) now encrypts the reply through the real
  [E2EE engine](./e2ee-crypto.md) (`encryptForConversation`) before emitting it over the socket —
  satisfying "replying from the notification encrypts and sends cleanly" for the case where the app
  is backgrounded but the JS engine is still alive (Notifee's `onBackgroundEvent`, same caveat
  documented in push-notifications.md). This is **not** the ticket's literal ask of doing so from
  *inside* a native extension/foreground-service process before the JS engine has even loaded — that
  half needs the native code below.
- **`plugins/withEncryptedPush.js`**: a real Expo config plugin (using the documented
  `withEntitlementsPlist` mod from `expo/config-plugins`) that adds the
  `group.com.cykrome.chatbox` App Group entitlement the NSE needs to share Keychain-backed ratchet
  state with the main app. Registered in `app.json`. This is genuine, valid config-plugin code — the
  one piece of the native setup that's safely automatable without hand-editing a `.pbxproj`, and it
  runs correctly the next time `expo prebuild` executes on a machine that has Xcode. It does **not**
  (and safely cannot) create the NSE *target itself* — see the plugin's own doc comment for exactly
  why that step needs either a specialized third-party plugin or a manual Xcode step.

## What's Reference-Only (`native-reference/`)

`native-reference/ios/NotificationService.swift` and
`native-reference/android/ChatboxFirebaseMessagingService.kt` are **not part of this repo's build**
— there's no `ios/`/`android/` native project for them to belong to, and no toolchain here to
compile or run either one. They exist to show the *integration shape* each platform's API requires
(`UNNotificationServiceExtension.didReceive`/`serviceExtensionTimeWillExpire`;
`FirebaseMessagingService.onMessageReceived`, the reply `RemoteInput` action) with the actual
decryption represented as calls into a `ChatboxCrypto` module that **doesn't exist yet** — porting
the Double Ratchet engine (`src/lib/crypto/doubleRatchet.ts`, `x3dh.ts`) from TypeScript to
Swift/CryptoKit and Kotlin/Android-Keystore is itself a substantial, separate undertaking, not
attempted here. Treat these two files as a detailed starting point for whoever picks up native
development on this project, not as tested code.

## What a Real Build Would Still Need

1. `expo prebuild` on a machine with Xcode + Android Studio, to generate the native `ios`/`android`
   projects this plugin and these reference files assume exist.
2. A real Apple Developer account (App Group + NSE target provisioning) and a real Firebase project
   (`google-services.json`/`GoogleService-Info.plist` — same gap as
   [Push Notifications](./push-notifications.md)).
3. Porting `doubleRatchet.ts`/`x3dh.ts` to Swift and Kotlin (the `ChatboxCrypto` module both
   reference files call into) — the TypeScript engine in this repo is the correct source of truth
   for that port's expected behavior (its `runSessionSelfTest()` self-test would be a good target to
   port first, to verify the native port agrees with the TS engine on the same test vectors).
4. A real server that never sends anything but the `IEncryptedPushPayload` shape through APNs/FCM.
