# Media & File Attachments

## Overview

The chat input's clip icon opens an `AttachmentSheet` with four options — Camera, Gallery,
Document, Location — backed by `expo-image-picker`, `expo-document-picker`, and `expo-location`.
Picked media is appended to the conversation as a normal `IMessage` carrying an `attachment`
(`src/interfaces/message-interface.ts`), rendered inline by `MessageBubble` via
`AttachmentContent`.

## Pieces

- **`src/components/messages/AttachmentSheet.tsx`** — bottom sheet modal with the four options.
- **`src/hooks/useAttachmentPicker.ts`** — `pickAttachment(option)` wraps each device
  integration's permission request + picker call and normalizes the result into an `IAttachment`,
  returning `null` on cancel/denial (with an `Alert` explaining how to grant the permission).
- **`src/components/messages/AttachmentContent.tsx`** — renders an `IAttachment` by `type`:
  - `image`/`video`: thumbnail (`video` also shows a play glyph overlay; tapping an image opens
    the fullscreen viewer), with an upload-progress bar overlay while `uploadProgress < 100`.
  - `document`: file icon, name, and size formatted as KB/MB.
  - `location`: coordinates, tapping opens the device's maps app via `Linking`.
- **`src/components/messages/MediaViewerModal.tsx`** — fullscreen image viewer with pinch-to-zoom
  and pan, built on `react-native-gesture-handler` + `react-native-reanimated` (no extra zoom
  library dependency). It also has a fade/scale entrance and a drag-to-dismiss gesture when not
  zoomed in — see `docs/architecture/micro-animations.md`.

## Simulated Upload Progress

There is no media storage/upload backend in this repository yet. `Chat.tsx` composes the
attachment message immediately with `attachment.uploadProgress: 0`, then advances it via
`updateAttachmentProgress` (in `messagesSlice`) on a local interval every 250ms until 100 — purely
to drive the progress bar UI. Replacing this with a real upload only requires swapping that
interval for actual upload progress callbacks; the reducer and UI already treat "reaching 100"
as "sent" (`message.status` is set to `"sent"` at that point).

## Permissions

`app.config.ts` registers `expo-image-picker` (`photosPermission`, `cameraPermission`) and
`expo-location` (`locationWhenInUsePermission`) config plugins with the permission rationale
strings shown on iOS. `expo-document-picker` uses the system file picker and needs no extra
native permission config.
