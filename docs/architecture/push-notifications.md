# Push Notifications, Background Sync & Interactive Quick Replies

## What's Real vs. What Needs a Backend

This ticket splits cleanly into two halves, and this repo has no real push server (no APNs
certificates, no FCM project, no backend to send anything from — see
[Realtime Messaging](./realtime-messaging.md) for the same constraint on the socket layer):

- **Real and working**: everything about *how a notification is presented and interacted with*
  once the client learns a message arrived — rich content, grouping, quick actions, badge count,
  in-app banners, mute/DND. All of this is implemented for real using `@notifee/react-native`
  (already a dependency, used for the incoming-call notification — see
  [Production Audio Calling Engine](./audio-calling-engine.md)) and is wired to fire whenever
  `useRealtimeConnection.ts`'s `onMessageReceive` handler runs — which today only happens if
  `EXPO_PUBLIC_REALTIME_URL` points at a real signaling server. Point this app at one, and every
  piece below fires correctly, using real message content, not a simulation.
- **Not implemented**: actual APNs/FCM registration and silent background push. `@react-native-firebase/messaging`
  (the ticket's suggested library) needs a real Firebase project and its generated
  `google-services.json`/`GoogleService-Info.plist` config files to even initialize — there's
  nothing to point it at in this environment, and shipping a half-configured Firebase SDK that
  throws on startup would be worse than not including it. The integration point is documented below
  instead.

## Interactive Notifications (`messageNotifications.ts`, `useMessageNotifications.ts`)

- `ensureMessageNotificationSetup()` requests permission, creates an Android notification channel
  (`messages`, high importance), and registers an iOS notification category (`message`) with two
  quick actions — **Reply** (`UNTextInputNotificationAction`-backed, via Notifee's `input` option)
  and **Mark as Read**. Both are cross-platform: Android's own `AndroidAction.input` provides the
  equivalent inline-reply text field in the notification shade.
- `showMessageNotification()` displays a notification with the chat's avatar (`android.largeIcon`,
  circular; `ios.attachments` for a thumbnail) and both quick actions attached directly to the
  notification (no need to open the app first).
- `useMessageNotifications()` (mounted once in `AppGate`) registers both `notifee.onForegroundEvent`
  and `notifee.onBackgroundEvent` listeners:
  - **Reply**: composes the typed text as a new message directly into that conversation
    (`composeMessage` + a `message:send` socket emit) — no app UI involved.
  - **Mark as Read**: dispatches the existing `markChatRead` reducer from
    [Chat Organization](./chat-organization.md) and cancels the notification.
  - **Plain tap**: navigates straight to that conversation's `Chat` screen.
  - **Cold-start caveat**: `onBackgroundEvent` is registered inside a mounted React hook, not at the
    true JS-module top level the way Notifee's own docs recommend for handling actions while the
    app is fully *killed* — this repo's entry point is the stock `expo-router/entry` with no custom
    `index.js` to register earlier. This means these actions work while the app is backgrounded but
    the JS engine is still alive; waking a genuinely terminated app to handle a background action
    needs a real silent push delivered by the OS before any JS runs at all, which needs the
    APNs/FCM piece described above.

## Notification Grouping & Badging

- **Grouping**: `android.groupId` and `ios.threadId` are both set to the conversation id, so
  multiple notifications from the same chat visually group together on both platforms (native OS
  behavior, no extra code needed beyond setting these fields consistently).
- **Badge count**: `useBadgeCountSync()` (mounted in `AppGate`) sums every chat's `notificationCount`
  (the same unread counter from [Chat Organization](./chat-organization.md)) and calls Notifee's
  `setBadgeCount()` whenever it changes, keeping the app icon badge in sync with the in-app unread
  total.

## Do Not Disturb & In-App Banners

- **Muted chats**: `onMessageReceive` checks `chat.muted` before doing anything notification-related
  — a muted chat produces no system notification and no in-app banner, full stop.
- **Currently-open conversation**: a new `connection.activeConversationId` (set/cleared by
  `Chat.tsx` on mount/unmount) is checked too — an incoming message for the chat you're already
  looking at doesn't need a banner or a system notification; the message just appears in the
  already-open thread.
- **Foreground vs. background routing**: if `AppState.currentState === "active"`, the app dispatches
  `showInAppBanner` (a small piece of `connection` state) instead of showing a system notification —
  `InAppMessageBanner.tsx` renders it as a dismissible card sliding in from the top, auto-dismissing
  after 4s, with a swipe-up-to-dismiss gesture and tap-to-open. If the app is backgrounded/inactive,
  `showMessageNotification()` fires the real system notification instead. This avoids double-firing
  both surfaces for the same message.

## Integration Point for Real Push (documented, not implemented)

A production deployment would add `@react-native-firebase/messaging` (or `expo-notifications`'
Expo push token flow) to: (1) request a device push token, (2) POST it to a backend endpoint tied
to the logged-in user, and (3) handle a data-only/"silent" push in a background handler that calls
the same `hydrateMessages`/`listAllMessages` sync path `useOfflineDbSync.ts` already uses at
startup, so messages are loaded before the user opens the app. None of steps 1–3 has anywhere real
to plug into without a Firebase project and a backend, so they're intentionally left as this
documented next step rather than stubbed-out dead code.
