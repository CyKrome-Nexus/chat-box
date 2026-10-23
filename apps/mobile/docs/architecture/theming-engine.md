# Advanced Theming Engine, Accent Colors & Chat Wallpaper Studio

## Overview

Implements issue #42: a real, instant-switching theme engine (5 modes), a customizable brand
accent color (8 presets + validated custom hex), and a Chat Wallpaper Studio (doodle/solid/
gradient/photo, with real blur/dim sliders and per-chat overrides).

## 1. Theme Palette Engine

`src/lib/theme/palettes.ts` defines five real, distinct palettes — `light`, `dark` (`#181818`),
`oledBlack` (true `#000000`), and `sepia` (warm reading tone) — each with background/surface/text/
border/header/tab-bar/incoming-bubble colors. `system` isn't a sixth palette; it's resolved to
`light`/`dark` from `useColorScheme()`.

`src/lib/theme/ThemeContext.tsx` provides `AppThemeProvider` (mounted in `_layout.tsx`, just inside
`GestureHandlerRootView`, above everything else) and the `useAppTheme()` hook, which returns
`{ mode, resolvedMode, colors, accent, isDark }`. This is a real React Context — not a mutated
shared module like the old static `Colors.ts` — so every component that calls `useAppTheme()`
re-renders the instant `settings.theme` or `settings.appearance.accentColor` changes in Redux, with
no polling and no restart. That's what makes theme switching instant and flash-free.

`settings.theme` (`src/redux/features/settingsSlice.ts`) is now `TThemeMode` = `"system" | "light" |
"dark" | "oledBlack" | "sepia"`. The old `TTheme` export is kept as a type alias to `TThemeMode` so
nothing else needed to change its imports.

## 2. Accent Color

`src/lib/theme/accentColors.ts` — 8 curated presets (Emerald, Ocean, Royal, Sunset, Ruby, Midnight,
Rose Gold, Monochrome; default Emerald `#24786D`, matching the app's original hardcoded brand
color so turning the engine on doesn't change anyone's look by default), plus `normalizeHexColor()`
for a validated free-text custom hex input (accepts `#abc`, `abc`, `#aabbcc`; rejects anything else).

`src/components/settings/AccentColorPicker.tsx` renders the preset grid + hex field + Apply button,
used in **Settings → Chat → Accent Color**. `settings.appearance.accentColor` is the persisted
value; `useAppTheme().accent` is how components read it.

### What's wired to accent, live

- Outgoing message bubbles (`MessageBubble.tsx`)
- The tab bar's active icon color (`(tabs)/_layout.tsx`)
- The Messages tab's active filter pill and pinned-chat icon (`messages.tsx`, `ChatRibbon.tsx`)
- Settings screens' primary/secondary buttons and active theme/preset chips
  (`settings-chat.tsx`, `settings-display.tsx`, `settings-wallpaper.tsx`)
- The display-zoom slider's fill/thumb color (`settings-display.tsx`)

Every other screen's buttons/icons still reference the old static `Colors.focused` — rewiring all
of them is the same kind of large, mechanical, low-risk follow-up called out in
[display-scaling.md](./display-scaling.md) for `scaleFont`, not something to rush through by
mutating the old shared `Colors` module in place (which wouldn't reliably re-render components that
don't otherwise subscribe to anything reactive).

### What's wired to the light/dark/OLED/sepia palette, live

Incoming message bubbles' background and text color read `theme.colors.incomingBubble`/
`incomingBubbleText` directly, so switching to OLED Black genuinely turns them near-black with
white text, not just the outgoing side. The rest of the app's screens keep their original
hardcoded light-mode backgrounds — reskinning all ~60 screens for dark/OLED/sepia is out of scope
for this pass; the palette and the hook both exist and are ready for that follow-up.

## 3. Chat Wallpaper Studio

### Config shape

`src/lib/wallpaper/wallpaperTypes.ts`:

```ts
interface IWallpaperConfig {
    kind: "none" | "doodle" | "solid" | "gradient" | "photo";
    doodleColor?: string;
    solidColor?: string;
    gradientKey?: string;
    photoUri?: string;
    blur?: number; // 0–100
    dim?: number;  // 0–80
}
```

Persisted in `settings.wallpaper`: `global` (the app-wide default) and `perChat: Record<conversationId,
IWallpaperConfig>` (per-chat overrides). New reducers: `setGlobalWallpaper`, `setChatWallpaper`,
`clearChatWallpaper`.

### Categories — all real, no placeholder assets

- **Doodle** (`src/components/messages/ChatWallpaperDoodle.tsx`): a genuinely vector-tiled SVG
  pattern (`react-native-svg`'s `<Pattern>`) of speech-bubble/dot/squiggle/heart motifs, recolored
  by `doodleColor` (5 tint presets) — not a bitmap asset.
- **Solid**: 6 flat-color presets.
- **Gradient** (`src/lib/wallpaper/wallpaperPresets.ts`): 21 two-stop presets rendered with
  `expo-linear-gradient` (already an app dependency) — well over the "20+" the ticket asked for.
- **Photo**: `expo-image-picker`'s gallery picker (the same pattern as `useAvatarPicker.ts`), with
  two **real** sliders (`src/components/common/GestureSlider.tsx`, a gesture-handler + reanimated
  drag control — the same primitives as the voice-note-studio scrubber and the display-zoom
  slider, not a native slider package needing an unverifiable prebuild):
  - **Blur** (0–100%) maps onto `expo-image`'s native `blurRadius` prop (a real platform-level
    blur, not a CSS trick faked in JS).
  - **Dim** (0–80%) is a `rgba(0,0,0,dim/100)` overlay `View` on top of the image.

`src/components/messages/ChatWallpaper.tsx` resolves a conversation's effective wallpaper (its own
`perChat` override if set, else `global`) and renders the right one of the above as an
absolute-fill background. It's mounted as the first child of `messages/Chat.tsx`'s message-list
container, behind the (transparent-background) `FlatList` — so every open chat actually shows its
configured wallpaper.

### Settings surface

`src/app/settings-wallpaper.tsx` is one screen serving two purposes:

- From **Settings → Chat → Chat Wallpaper** (no `conversationId` param) — edits the global default.
- From **Contact Info → Chat Wallpaper** (`contact-info.tsx`, pushed with `?conversationId=...`) —
  edits that one conversation's override, with a "Use app default wallpaper" reset row that calls
  `clearChatWallpaper`.

The screen shows a live preview card that updates as categories/colors/sliders change, category
tabs (None/Doodle/Gradient/Photo — solid is reachable once a solid color is picked; there's no
separate "Solid" tab since choosing a doodle/gradient/photo already switches `kind`), and the
relevant preset grid/slider set for whichever kind is selected.

### What's out of scope

- **Group Info** has no wallpaper entry point yet (only 1-on-1 `contact-info.tsx` does) — group
  wallpaper override is the same feature, just needs a row added to `group-info.tsx`, which doesn't
  currently have an entry-list layout to match against. Left as a follow-up rather than bolting a
  new list section onto a screen whose actual current layout wasn't audited for this ticket.
- **Curated high-resolution photo wallpapers** (the ticket's third pre-installed category, alongside
  doodle and solid/gradient) aren't included — there's no real photo asset library available in
  this environment, and shipping placeholder/stock-looking images described as "curated" would be
  the kind of fabricated-but-plausible content this repo's documentation explicitly avoids. Doodle,
  solid, gradient, and the user's own gallery photos (with real blur/dim) cover the rest of the
  spec's wallpaper surface honestly.
