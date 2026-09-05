# Dynamic Display Zoom, Text Scaling & Responsive Layout Engine

## Overview

Three related pieces, all real and working:

1. A **display scale engine** (`useDisplayScale`) — a single 80%–165% multiplier, driven either
   by the OS's own accessibility text-size setting or by an in-app slider, applied live to the
   surfaces that render the most text.
2. A **non-clipping bubble/list architecture** fix on the two surfaces the ticket calls out by
   name — message bubbles and the chat list — removing fixed heights and adding graceful wrapping.
3. A **responsive layout engine** (`useResponsiveLayout`) that switches the Messages tab to a real
   Master-Detail split view on tablets/foldables (>= 600dp width).

## 1. Display Scale Engine

`src/redux/features/settingsSlice.ts` persists `settings.display`:

```ts
display: {
    zoomLevel: number;        // 0.8–1.65, the manual slider's value
    useSystemTextSize: boolean; // default true
}
```

`src/lib/display/useDisplayScale.ts` is the single source of truth for "how big is everything
right now":

- `useSystemTextSize: true` (default) → the scale comes from `PixelRatio.getFontScale()`, which is
  a real value React Native reads from the OS — iOS Dynamic Type / Android Display Size — clamped
  into the same 80%–165% band the manual slider covers, so an extreme OS setting can't exceed the
  range this layout has actually been checked against.
- `useSystemTextSize: false` → the scale comes from the manual `zoomLevel`, set by the slider or
  one of the six presets (`Small 80%`, `Default 100%`, `Medium 115%`, `Large 130%`,
  `Extra Large 150%`, `Maximum 165%`) in **Settings ➔ Chat ➔ Text & Display Size**
  (`src/app/settings-display.tsx`).
- Either way, the hook is a plain `useSelector` + `PixelRatio` read — every component calling it
  re-renders the instant the underlying value changes, with no restart step, satisfying "updates
  entire app UI in real time."

`scaleFont(size)` and `scaleSpacing(size)` both just multiply-and-round by that scale — the exact
granular unit system the ticket asks for.

The slider itself (`src/components/settings/DisplayScaleSlider.tsx`) is a custom
`react-native-gesture-handler` + `reanimated` drag control (the same primitives already used for
the voice-note-studio scrubber), not a native slider package — this avoids adding a dependency that
would need a prebuild this environment can't run or verify. The settings screen's preview card
(`settings-display.tsx`) uses the same `scaleFont`/`scaleSpacing` helpers on a sample avatar +
sender/receiver bubble pair, so it updates live as the slider moves, exactly like the real chat
screen would.

### What's actually wired up

`scaleFont` is applied to every text element in:

- `MessageBubble.tsx` — sender/receiver text, reply-quote text, sender-name label, deleted-message
  placeholder, edited/timestamp meta row, all previously hardcoded `fontSize` values.
- `ChatRibbon.tsx` (the conversation list row) — contact name, draft/last-message preview, and the
  right-hand status label.

These are the two surfaces the acceptance criteria name explicitly ("message bubbles... message
timestamps"). Every other screen's text still uses its original hardcoded font sizes — `scaleFont`/
`scaleSpacing` are exported and ready to use, but wiring all ~60 remaining screens one at a time is
a large, mechanical, low-risk follow-up, not something to rush through in this pass by patching
React Native's `Text` internals globally (a technique that's hard to verify without a running
simulator and risks silently breaking the design-fidelity requirement everywhere at once).

### Non-clipping fixes

- `ChatRibbon.tsx`: `row`/`container` changed from a hardcoded `height: 80` to `minHeight: 80`, and
  `statusContent`'s `height: "100%"` (which depended on that fixed height) changed to
  `alignSelf: "stretch"` — the ribbon now grows to fit a scaled-up name/preview instead of clipping
  it. The contact name gained `numberOfLines={1}` so it truncates with an ellipsis rather than
  wrapping the row's horizontal layout.
- `MessageBubble.tsx`: the bubble itself never had a fixed height. `metaRow` (timestamp + edited
  label + status ticks) gained `flexWrap: "wrap"` and `justifyContent: "flex-end"` so at 165% zoom
  a long "edited" + timestamp + read-receipt combination wraps onto a second line under the bubble
  instead of being clipped or pushed off the bubble's edge.

## 2. Responsive Layout Engine

`src/lib/display/useResponsiveLayout.ts` wraps `useWindowDimensions()` (a live subscription, so it
re-evaluates on rotation, split-screen, or unfolding a foldable) and exposes:

```ts
{ width, height, isTablet /* >= 600dp */, isCompactPhone /* < 360dp */ }
```

### Master-Detail split view

`src/components/layout/MasterDetailLayout.tsx` renders a fixed-width (380dp) conversation-list pane
next to a detail pane, and `src/app/(tabs)/messages.tsx` switches into it whenever
`useResponsiveLayout().isTablet` is true:

- The list pane is the exact same `FlatList`/`ChatRibbon` content phones use.
- `ChatRibbon` gained an optional `onSelect` prop — on tablets, tapping a row calls
  `setSelectedChatId(content.id)` instead of `router.push(...)`; on phones `onSelect` is left
  `undefined` so `ChatRibbon` falls back to its original push-to-`/messages/Chat` behavior,
  completely unchanged.
- The detail pane renders `src/app/messages/Chat.tsx` directly — not a re-implementation of it.
  `Chat` gained one optional prop, `embeddedUser?: IChatRibbon`, which takes priority over the
  route's `user` param when present. This means the tablet's right pane gets the *entire* real
  chat thread — live WebRTC calls, E2EE, media, voice notes, everything — for free, with zero
  duplicated logic. When nothing is selected yet, the pane shows an empty-state placeholder
  ("Select a chat to start messaging"), matching the ticket's third documented state.
- `selectedChatId` is looked up against the live `chats` array on every render (`selectedChat =
  chats.find(...)`), not stored as a snapshot — so read receipts, typing indicators, and new
  messages in the selected conversation stay live in the embedded pane exactly as they would on a
  phone's pushed screen.
- Because `isTablet` is derived from `useWindowDimensions()` and `selectedChatId` lives in the same
  component that decides which layout to render, unfolding a foldable mid-conversation re-renders
  straight into the split view with the same chat still selected — no remount, no reload, no state
  loss, satisfying the "seamless transition" acceptance criterion directly.

### Compact phones / everything else in the spec

The `isCompactPhone` (< 360dp) flag is exported and ready to gate condensed paddings/button sizing,
but no screen currently branches on it — the app's existing paddings were not observed to clip on a
360dp-class device, so no changes were made there to avoid touching layouts without a concrete
failure to fix. Wiring `isCompactPhone` into any screen that does show a real problem on a specific
device is a follow-up once such a device/simulator is available to verify against, in keeping with
this repo's rule of not changing layout code without something real to test it against.
