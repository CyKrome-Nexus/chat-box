# Custom Fonts & Splash Screen Readiness Gate

## Overview

The app ships two custom TTF fonts in `assets/fonts/`:

- `Carme Regular.ttf` → font family `"Carme Regular"`
- `Inter 18pt Bold.ttf` → font family `"Inter 18pt Bold"`

Both are referenced by exact family name in `StyleSheet` definitions across headers, tab
titles, and `CarmeText`. They must be loaded via `expo-font` before any such screen renders,
otherwise RN silently falls back to the platform default font.

## Loading Flow

`src/app/_layout.tsx` (the Expo Router root layout) is the single place fonts are loaded:

1. `SplashScreen.preventAutoHideAsync()` is called at module scope so the native splash screen
   stays visible past the JS bundle's initial mount.
2. `useFonts({...})` loads both TTF files by their exact family name via `require(...)`.
3. While loading (`!fontsLoaded && !fontError`), the layout renders `null` — no screen, provider,
   or navigator mounts yet, so nothing can render text with the fallback font.
4. Once fonts are ready (loaded or errored), `SplashScreen.hideAsync()` is called — both eagerly
   in a `useEffect` and defensively in the root view's `onLayout`, so the splash is dismissed as
   soon as the first frame is actually ready to paint.

## Adding a New Font

1. Drop the `.ttf` file into `assets/fonts/`.
2. Add a `"Family Name": require("../../assets/fonts/File.ttf")` entry to the `useFonts` call in
   `src/app/_layout.tsx`.
3. Reference `fontFamily: "Family Name"` in styles — it must match the key used in `useFonts`
   exactly (case- and space-sensitive).
