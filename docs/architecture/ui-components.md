# UI Component & Style Conventions

This document captures React Native styling conventions enforced across the shared component
library (`src/components/`), established after fixing a batch of invalid-style bugs.

---

## 1. Border Radius

React Native's native style engine (iOS/Android) does not support percentage strings for
`borderRadius` — only numbers are valid. To render a fully circular view:

- If the view's `width`/`height` are known at style-authoring time, use half of that fixed value
  (e.g. `borderRadius: width / 2` in `BIcon`).
- If the width is dynamic/unbounded, use a large fixed constant like `borderRadius: 9999` so the
  radius always exceeds half of any realistic dimension (used in `IconSVG`'s `border` style and
  `SettingsRibbon`'s `iconContainer`).

Never use `borderRadius: '100%'` — it is silently ignored on native platforms.

## 2. Conditional Entries in Style Arrays

When conditionally including a style in a `style={[...]}` array, use `undefined` (or `false`) as
the "no-op" branch, never an empty string `""`. An empty string is not a valid `ViewStyle` and
triggers RN's style-flattening warnings.

```tsx
style={[styles.base, condition ? styles.extra : undefined]}
```

## 3. SVG Icon Definitions

Icon SVG markup lives in `src/constants/svgs/*.ts` as raw XML strings implementing `IIconSVG`.
Every `stroke`/`fill` attribute must be a valid CSS color (name, hex, or `currentColor`) — typos
here (e.g. a stray `stroke="]"`) produce an invalid SVG that fails to render on some renderers
without throwing a build-time error, so these files need visual/manual review after edits.

## 4. Themed Text Components

`CarmeText` (`src/components/Themed/CarmeText.tsx`) wraps RN's `Text` with the app's custom font.
Its prop type must extend `TextProps` from `react-native`, not `react-native-svg` — the two
packages both export an unrelated type named `TextProps`.

## 5. Settings Screen & Tab Header Navigation

`src/app/(tabs)/settings.tsx` and `src/app/(tabs)/_layout.tsx`:

- Icon buttons (`BIcon`) with destructive or navigational side effects (e.g. logout) must never
  be wired to an unrelated icon's `onPress` — the settings QR icon previously triggered
  `logoutUser` by mistake. Until the QR sharing/scanner screen exists, action-less icons should
  have no `onPress` handler rather than a placeholder that does the wrong thing.
- The Settings tab's header back button navigates with `router.back()` (falling back to
  `router.push("/")`) directly inside `onPress`. Do not add artificial `await sleep(ms)` delays
  before navigating — they only introduce a window for accidental double-taps/race conditions
  without providing any benefit.

## 6. `ListDrawer` Bottom Sheet

`src/components/ListDrawer.tsx` is the draggable bottom-sheet frame wrapping every tab's list
(chats, calls, contacts, settings).

- Sizing (`minHeight`/`maxHeight`/`startHeight`/`startTop`) comes from `useWindowDimensions()`,
  not a module-level `Dimensions.get('window')` snapshot — the hook re-renders the component (and
  an effect re-snaps the sheet's shared values) when the window size actually changes, so rotation,
  split-screen, and foldable unfold don't leave the sheet with stale drag bounds.
- The drag gesture (`GestureDetector`) is attached to the small handle bar only, not to
  `{children}` (which holds each screen's `FlatList`) — that scoping is what prevents the sheet's
  pan gesture from fighting the list's own scroll gesture. Keep any future drag affordance scoped
  the same way rather than wrapping the whole sheet. `activeOffsetY([-10, 10])` on that gesture
  additionally requires a deliberate vertical movement before the drag activates, so a light tap on
  the handle doesn't jitter the sheet.
- Never leave dead/unused local state in this file (it previously held an entire duplicate mock
  chat list that was never rendered) — the chat/call/contact lists it wraps all come from Redux
  (`chatsSlice`, `callSlice`, `contactsSlice`) via the screens that render as `{children}`.

## 7. Route Param Parsing

Any screen reading a JSON-encoded route param (e.g. `messages/_layout.tsx` and `messages/Chat.tsx`
parsing `params.user`) must wrap `JSON.parse` in a try/catch and fall back to `null` — a malformed
or missing deep-link query must never crash the screen.
