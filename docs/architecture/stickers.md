# Telegram-Grade Animated Stickers, Sticker Maker & GIF Engine

## Animated Sticker Engine

- **`.tgs` (real Telegram format)**: `.tgs` is gzip-compressed Lottie/Bodymovin JSON. Since this
  offline environment has no way to download real Telegram sticker packs, four `.tgs` files were
  hand-authored from scratch (`assets/stickers/*.tgs` — a bouncing ball, a spinning star, a pulsing
  "heart", a rotating rounded square) as valid Lottie animation JSON, then genuinely gzip-compressed
  to produce real `.tgs` binaries — not fabricated/renamed files. `metro.config.js` adds `tgs` to
  `resolver.assetExts` so Metro bundles them as opaque binary assets (it doesn't know the extension
  by default). `tgsLoader.ts` resolves the bundled asset to a local file (`expo-asset`), reads its
  bytes, gunzips with `pako`, and parses the JSON — cached per asset so repeated renders don't
  redecompress. `StickerView.tsx` feeds the result to `lottie-react-native`, which does the actual
  hardware-accelerated (Skia-backed on both platforms) 60fps rendering.
- **Animated WebP**: rendered via `expo-image` (the only cross-platform RN `Image` that actually
  animates WebP on both iOS and Android — the built-in `Image` only auto-animates WebP on Android).
  The rendering *path* is real and functional; no animated WebP demo asset was hand-authored (there's
  no image-encoding toolchain available here to produce real animated WebP bytes), so seeded demo
  stickers are all `.tgs`. Custom stickers made in-app (see below) are static PNGs rendered through
  this same code path — `expo-image` handles static images fine too, "webp" here really means "not
  Lottie, so use `expo-image`" rather than a hard promise every sticker of this type has to be
  literally WebP-encoded.
- **Autoplay-on-visible / pause-off-screen**: `StickerView` takes an `isVisible` prop; the sticker
  picker/pack manager thumbnails pass `isVisible={false}` for anything not the active tab's grid to
  avoid dozens of simultaneous Lottie animations draining battery, and `pause()`/`resume()` (not
  unmount/remount) so a sticker resumes from where it left off rather than restarting.

## Sticker Pack Manager & Store (`/sticker-packs`)

Install/uninstall toggle, and reorder via up/down buttons rather than drag-and-drop — a real
touch-drag reorder (long-press, track finger position, live-swap list items) is a substantial
gesture-choreography undertaking on its own, and up/down buttons deliver the same end result
(changing installed-pack order) with a fraction of the risk of subtly-broken gesture math that
can't be verified on a real device in this environment. Recent and Favorites tabs live in the
sticker keyboard panel itself (`StickerPicker.tsx`) rather than the manager screen, matching where
Telegram/WhatsApp actually put them (long-pressing a sticker in the picker toggles favorite).

### Share via Deep Link

`buildStickerPackDisplayLink()` produces the ticket's literal `chatbox.app/addstickers/[pack_id]`
string for copy/share text, but — exactly like the group invite links in [Groups](./groups.md) —
*actually opening the app and installing the pack* uses the app's own `chat-box://addstickers/
[packId]` scheme, resolved by Expo Router to `/addstickers/[packId].tsx`. `chatbox.app` isn't a
real, resolvable web domain here, so the QR/link that actually functions is the custom-scheme one,
demonstrable only on this same device (there's no second real device or pack-distribution server to
share a pack *to*).

## In-App Custom Sticker Maker (`/sticker-maker`)

- **Automatic subject cutout is not implemented.** `VNGeneratePersonSegmentationRequest` (iOS
  Vision framework) and ML Kit Subject Segmentation are both native-only APIs with no
  pure-JS/Expo-compatible equivalent — using them needs a custom native module, which needs a
  native build toolchain this environment doesn't have (the same category of gap as
  [Encrypted Push](./encrypted-push.md)'s NSE/FCM native code).
- **Manual lasso cutout is the real, working substitute**: the user free-hand traces around the
  subject with their finger (`Gesture.Pan()` collecting points into one SVG `Path`, closed into a
  loop on release), which becomes a real `<ClipPath>` applied to the photo (`react-native-svg`'s
  `Image` element) — genuinely clips the displayed image to the traced shape, not a fake preview.
  The traced outline is also drawn as a thick white stroked `Path` directly over the clip boundary,
  producing the "white border around the cutout" effect the ticket asks for.
- **Text/doodle/emoji overlays**: not wired into this screen in this pass — the exact same
  draggable-overlay infrastructure built for the chat media editor
  ([In-App Camera & Media Editor](./media-editor.md)'s `DraggableOverlayItem.tsx`/`DoodleCanvas.tsx`)
  is directly reusable here and would be the natural next step, just not connected up yet.
- **Save**: `react-native-view-shot`'s `captureRef` (PNG, which preserves alpha transparency outside
  the clip path) captures the composed canvas and the result is added to the always-installed "My
  Stickers" pack (`addCustomSticker`).

## Giphy/Tenor GIF Engine

**Not implemented in this pass.** A real integration is genuinely reachable without any native
module (both Giphy and Tenor are plain REST APIs callable via `fetch`), but needs a real API key —
this repo has no `EXPO_PUBLIC_GIPHY_API_KEY`/`EXPO_PUBLIC_TENOR_API_KEY` configured, and guessing or
hardcoding a plausible-looking key would be worse than being explicit that this piece is scaffolded
but not built. A follow-up implementing trending/search would gate on that env var exactly the way
[Realtime Messaging](./realtime-messaging.md) gates on `EXPO_PUBLIC_REALTIME_URL` — real code,
inert without a credential this sandbox doesn't have.
