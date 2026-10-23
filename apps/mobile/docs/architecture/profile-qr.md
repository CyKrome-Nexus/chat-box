# Profile View/Edit & QR Code Sharing/Scanning

## Profile Screen (`src/app/profile.tsx`)

A modal route reached by tapping the avatar in Settings or the Home tab header. Shows/edits:

- **Photo**: tapping the avatar opens an `Alert` action sheet (Take Photo / Choose from Library).
  `src/hooks/useAvatarPicker.ts` wraps `expo-image-picker` with `allowsEditing: true, aspect: [1,1]`
  so every avatar is cropped to a square, unlike the chat attachment picker
  (`useAttachmentPicker`) which doesn't force cropping.
- **Name** and **About**: editable text fields; a "Save" button appears only while the form is
  dirty (`name`/`about` differ from the stored `user`), and dispatches `updateUser` on press.
- **Identifier**: read-only — this app's login identifier is either an email or a phone number
  (see `docs/features/auth-profile.md`), so the field is labeled "Email" or "Phone number" based
  on `isEmail(user.username)` rather than assuming one or the other.
- A "My QR Code" button opens `/qr-code`.

## QR Code (`src/app/qr-code.tsx`)

**Updated by issue #43** — this used to encode `user.username` (the private login identifier:
phone number or email) directly into a public, shareable QR code/link, since there was no public
handle concept yet. That's fixed now: it encodes `user.handle` (the public `@username` — see
[username-system.md](../../../../docs/architecture.md)) instead, and shows a "claim a username" prompt with no
link/QR at all until one exists, so the private identifier is never exposed through this screen.

Renders a QR code (via `react-native-qrcode-svg`, chosen because it draws directly with the
already-installed `react-native-svg` — no extra native module) encoding a profile link built by
`src/lib/profile/profileLink.ts`: `buildProfileLink(handle)` → `https://chatbox.link/@handle`.

- **Copy Link** — `expo-clipboard`.
- **Share** — React Native's built-in `Share.share()`, sharing the link as text. Sharing the QR
  *image* itself (e.g. via `react-native-view-shot`) was left out to avoid an extra dependency for
  a secondary action; the link text covers the same "let someone else start a chat with me" goal.

## QR Scanner (`src/app/qr-scanner.tsx`)

Uses `expo-camera`'s `CameraView` with `barcodeScannerSettings={{ barcodeTypes: ["qr"] }}` — no
separate `expo-barcode-scanner` package needed (deprecated in favor of `expo-camera`'s built-in
scanning). On a successful scan, `parseProfileLink` extracts the `@handle` from the link.

**Updated by issue #43** — the extracted handle is now resolved through a real
`lookupByHandle()` registry lookup (see [username-system.md](../../../../docs/architecture.md)) instead of
being trusted directly as both the chat's `id` and display name; an unregistered handle now shows
a "username not found" alert. A QR value that isn't a `chatbox.link`/`chatbox.me` profile link
still shows the original "not a Chatbox QR code" alert instead of silently failing or crashing.
