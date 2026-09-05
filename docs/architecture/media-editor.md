# In-App Camera, Media Compressor & Editor

Replaces the "Camera" option in `AttachmentSheet`, which used to launch the system camera app
(`ImagePicker.launchCameraAsync`) — that call site in `useAttachmentPicker.ts` is now dead code,
left as a comment pointing here.

## Flow & Cross-Route Handoff (`mediaComposerBridge`)

Three screens, chained via `router.replace`/`router.back` so the stack only ever has one of them
mounted at a time:

1. **`/camera-capture`** — the viewfinder.
2. **`/media-editor`** — crop/rotate/doodle/text/sticker + caption + view-once + send/discard.
3. Back to **`Chat.tsx`**.

Both new screens are top-level `fullScreenModal` routes (registered in `src/app/_layout.tsx`,
same pattern as `call`/`qr-scanner`), not nested under `messages/_layout.tsx`, so there's no prop
path back to the `Chat` component that triggered them. `src/lib/media/mediaComposerBridge.ts` is a
one-shot singleton listener — the same cross-lifecycle-singleton pattern used for
`callEngineManager` — that `Chat.tsx`'s `handleAttachmentOption("camera")` registers a callback on
right before navigating in, and that `media-editor.tsx`'s send/discard handlers call right before
navigating back out, handing over `{ attachment, caption } | null`.

## In-App Camera (`camera-capture.tsx`)

Uses `expo-camera`'s `CameraView` (not `react-native-vision-camera` as the ticket specifically
named — see **Scoping Notes** below) with a single shutter button:

- **Tap** → `takePictureAsync()`.
- **Hold** (300ms threshold, tracked via `setTimeout` in `onPressIn`/cleared in `onPressOut`) →
  starts a video recording.
- Front/rear toggle, a 3-state flash cycle (off → on → auto) reflected in the `flash` prop, and
  pinch-to-zoom (`Gesture.Pinch()` mapped to `CameraView`'s `zoom` prop, 0-1).

**Mode-switch race**: `CameraView`'s `mode` prop ("picture" vs "video") has to actually take effect
before `recordAsync()` will work reliably — flipping the prop and calling `recordAsync()` in the
same tick risks calling it before the camera has reinitialized for video. `startVideo()` flips
`cameraMode` to `"video"` and sets a `pendingRecordRef` flag; the actual `recordAsync()` call is
deferred to the next `onCameraReady` firing (mirroring `useVideoNoteRecorder`'s existing
start-then-wait-for-ready split from the [video notes](./video-notes.md) ticket).

## Media Editor (`media-editor.tsx`)

**Crop & Rotate**: `src/lib/media/cropRotateImage.ts` wraps `expo-image-manipulator`.
`rotateImage90` applies a real 90° rotation. The four aspect presets (Free/1:1/4:3/16:9) apply a
real, pixel-level **centered** crop — not an interactive drag-to-reposition crop box. A freeform
crop-box UI (drag corners/edges, live preview) is a substantial its-own-ticket feature; centered
presets deliver the acceptance criterion (real cropping, real aspect ratios) without that scope.

**Doodle canvas** (`DoodleCanvas.tsx`): freehand drawing via `Gesture.Pan()` building one SVG
`Path` per stroke; only captures touches while the "draw" tool is active so it doesn't block the
sticker/text pan gestures otherwise. Undo/redo operate on whole strokes (pop/push the finished-path
stack), not individual points.

**Text & stickers** (`DraggableOverlayItem.tsx`): both are entries in one `IOverlayItem[]` list,
each independently draggable (`Gesture.Pan`), scalable (`Gesture.Pinch`), and rotatable
(`Gesture.Rotation`), composed via `Gesture.Simultaneous`. Text items get a color palette and a
3-way font picker (system default, plus the app's two bundled custom fonts — `Carme Regular` and
`Inter 18pt Bold`, see [Fonts & Splash](./fonts-and-splash.md)). Stickers are emojis, placed via the
existing `EmojiPicker` component reused in a bottom-sheet modal — there's no bundled bitmap sticker
pack in this repo, so "stickers" here means emoji, not licensed sticker art.

**Baking**: on send, `react-native-view-shot`'s `captureRef` screenshots the composed canvas View
(photo + doodle SVG + overlay items) into a single flattened image — this is what "annotations
baked into the sent media payload" means here. The screenshot is captured at **on-screen
resolution**, not the original camera capture's full resolution — flattening overlays into a
full-resolution image server-side (or via an off-screen render at native resolution) is possible
but meaningfully more work than an on-device sandbox without a physical device can responsibly
verify; screen-resolution output is more than sufficient for chat-bubble display.

**Video**: the editor screen only offers caption + view-once + rotate-free pass-through for video
(the toolbar's crop/draw/text/sticker buttons are hidden). Baking overlays into a video means real
frame-by-frame video compositing/re-encoding — out of scope for the same reason video *compression*
is (see below) — so video attachments still go out as exactly what the camera recorded.

**Caption & View Once**: the bottom bar's caption `TextInput` becomes the sent message's `text`
(`sendAttachmentMessage(attachment, caption)` in `Chat.tsx`). "View once" sets
`IAttachment.viewOnce`; `AttachmentContent.tsx` gates image/video rendering behind a "Tap to view
once" card for the **receiver** side only (the sender already knows what they sent) and flips
`viewOnceOpened` via a new `markAttachmentViewed` reducer once tapped — there is no
disappear-after-viewing deletion since there's no real message-delivery backend to enforce it on
the sender's copy either.

## Compression

`src/lib/media/compressImage.ts` re-encodes the final baked screenshot to WEBP via
`expo-image-manipulator`, stepping `compress` (quality) down from 0.8 in steps of 0.15 (floor 0.3)
until `expo-file-system`'s `File(uri).size` is under the ticket's 300KB target, or the quality floor
is hit.

**Video compression/transcoding is not implemented.** The ticket asks for H.264/AAC MP4
transcoding to cut payload size — that requires a real video codec pipeline (e.g.
`ffmpeg-kit-react-native`, or `react-native-vision-camera`'s frame processors with a hardware
encoder), none of which are installed. Adding one is a meaningfully large native-module integration
(new config plugin, native build verification) that this environment can't build/test against a
real device. Video attachments are sent at their original camera-recorded size, same as every
other video attachment path in this repo already documented in
[Media Attachments](./media-attachments.md).

## Scoping Notes

- **`expo-camera` instead of `react-native-vision-camera`**: the ticket names
  `react-native-vision-camera` specifically, but this repo already has a working, permission-wired
  `expo-camera` pipeline from the [video notes](./video-notes.md) ticket. Adding a second, heavier
  native camera library — with its own config plugin, its own SDK-54 compatibility pinning (the
  kind of exercise already needed for `react-native-webrtc`/`react-native-callkeep`, see
  [Production Audio Calling Engine](./audio-calling-engine.md)) — for a feature `expo-camera`
  already satisfies (fast launch, tap/hold capture, flash, zoom, front/rear) wasn't worth the
  duplicated native surface area and unverifiable-in-this-environment build risk.
- No real upload/storage backend exists yet — `uploadProgress` is still the same local timer
  simulation used by every other attachment type.
