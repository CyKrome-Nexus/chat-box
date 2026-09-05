# Chat Box Documentation

Welcome to the comprehensive technical documentation for the **Chat Box** mobile and web application.

---

## 📚 Documentation Index

All features, architectural designs, protocols, and data models are organized within this directory:

| Guide | Description |
|---|---|
| [System Architecture](./architecture/overview.md) | High-level system architecture, state management, offline-first engine, and network topologies. |
| [Database & Offline-First (design)](./architecture/database.md) | Original design note — see the implementation doc below. |
| [Offline-First Database Engine](./architecture/offline-database.md) | expo-sqlite schema, startup hydration, write-through persistence, sync-queue exponential backoff. |
| [End-to-End Encryption (E2EE)](./architecture/e2ee-security.md) | Signal Protocol (X3DH, Double Ratchet, Sender Keys), AES-256-GCM media encryption, and zero-knowledge push notifications. |
| [Chat & Messaging](./features/chat-messaging.md) | Real-time WebSocket messaging, message bubbles, long-press actions, reactions, quotes, and drafts. |
| [Voice, Video & Media](./features/voice-video-media.md) | Voice notes (live waveform), circular video notes, in-app camera, media editor, and stickers. |
| [Audio & Video Calling](./features/calling.md) | WebRTC VoIP calling, CallKit / Android Telecom integration, and Picture-in-Picture (PiP). |
| [Stories & Status](./features/status-stories.md) | 24-hour ephemeral status updates, prefetching, and privacy rules. |
| [Theming & Accessibility](./features/theming-customization.md) | Theme palette, OLED Black mode, chat wallpaper studio, and dynamic display zoom. |
| [Authentication & Profiles](./features/auth-profile.md) | Auth flows, session persistence, `@username` registry, and phone number privacy. |
| [UI Components & Styling](./architecture/ui-components.md) | React Native style conventions (border radius, conditional styles, SVG icons, themed text). |
| [Fonts & Splash Screen](./architecture/fonts-and-splash.md) | Custom font loading via `expo-font` and the splash screen readiness gate. |
| [Realtime Messaging Infrastructure](./architecture/realtime-messaging.md) | Socket.IO client, event contract, connection status, offline outbox queue & flush-on-reconnect. |
| [Media & File Attachments](./architecture/media-attachments.md) | Attachment sheet, camera/gallery/document/location pickers, media bubbles, fullscreen pinch-to-zoom viewer. |
| [Voice & Audio Messaging](./architecture/voice-messages.md) | Recording (mic button, timer, slide-to-cancel), waveform bubbles, single-track playback. |
| [Advanced Voice Note Studio](./architecture/voice-note-studio.md) | Swipe-up-to-lock, real live waveform capture, handsfree pause/preview/send, scrubbing, playback speed, continuous playback. |
| [Emoji Picker](./architecture/emoji-picker.md) | Categorized emoji panel, search, recents, cursor-position insertion. |
| [Social Authentication](./architecture/social-auth.md) | Google/Facebook/Apple OAuth wiring, per-button handlers, account creation & linking. |
| [Device Contacts](./architecture/contacts.md) | expo-contacts sync, registered-status lookup, search, add-contact modal, start-chat flow. |
| [Audio & Video Calling UI](./architecture/calling.md) | Call state machine, outgoing/incoming/active screens, call history logging. |
| [Production Audio Calling Engine](./architecture/audio-calling-engine.md) | WebRTC, CallKit/Telecom native call UI, proximity-sensor audio routing — and an honest list of what still needs real infra/credentials. |
| [Full-Featured Video Calling](./architecture/video-calling.md) | Singleton call engine, camera flip/preview, adaptive bitrate, in-app PiP bubble, group video grid — and what's still SFU/native-PiP-dependent. |
| [Profile & QR Code](./architecture/profile-qr.md) | Profile view/edit, avatar cropping, QR code generation/sharing, QR scanner. |
| [Fluid Micro-Animations & Gestures](./architecture/micro-animations.md) | Swipe-to-reply, keyboard-interactive input bar, morphing send/mic button, lightbox drag-to-dismiss, animated status ticks. |
| [Telegram-Style Circular Video Notes](./architecture/video-notes.md) | Tap-to-toggle voice/video mic mode, circular front-camera recording with progress ring, autoplay-muted playback bubble, fullscreen viewer. |
| [In-App Camera, Media Compressor & Editor](./architecture/media-editor.md) | In-app camera (tap/hold, flash, zoom, flip), crop/rotate/doodle/text/sticker editor with view-shot baking, caption + view-once, WEBP compression. |
| [Media Lightbox, Document Viewer & Shared Gallery](./architecture/media-gallery.md) | Swipeable pinch-zoom lightbox with share/save/forward/delete, in-app PDF preview, Contact Info entry point, tabbed shared-media gallery with OG link previews. |
| [Message Actions Menu](./architecture/message-actions.md) | Long-press reaction pill + action menu (reply/copy/forward/edit/star/delete/info), jump-to-original quoted replies, edit window, delete-for-everyone tombstones, starred messages. |
| [Chat Organization & Management](./architecture/chat-organization.md) | Pinning (max 5), swipe-to-archive with a collapsible archived section, unread filter pills + tab badge, mark as read/unread, and local draft auto-save. |
| [Global & In-Chat Search](./architecture/search.md) | SQLite FTS5 message index with a LIKE fallback, full-screen global search with media-type filter chips and highlighted matches, in-chat search with a stepper and jump-to-match. |
| [Biometric App Lock & Privacy Controls](./architecture/security-privacy.md) | Face ID/Touch ID app lock with configurable auto-lock timeout and app-switcher hiding, granular Everyone/Contacts/Nobody privacy toggles, wired-up read receipts, and per-chat disappearing messages with real SQLite purge. |
| [Ephemeral Stories & Status](./architecture/stories.md) | 24-hour status updates (photo/video/text) with a viewed/unviewed ring carousel, a segmented-progress story player with tap/hold/swipe-up-to-reply, viewer analytics, and auto-expiry. |
| [Groups, Admin Permissions, Invite Links & Broadcasts](./architecture/groups.md) | Multi-step group creation, color-coded sender names, @mention autocomplete, admin promote/demote/remove, send/edit permission gating, working invite-link QR deep links, and broadcast list fan-out sending. |
| [Push Notifications, Background Sync & Quick Replies](./architecture/push-notifications.md) | Interactive Reply/Mark-as-Read notification actions, rich avatar previews, per-conversation grouping, app badge sync, mute/DND-aware in-app banners — and what real APNs/FCM registration would still need. |
| [Deep E2EE Cryptographic Engine](./architecture/e2ee-crypto.md) | Real, from-scratch X3DH + Double Ratchet + Sender Keys using pure-JS Curve25519/Ed25519/AES-CBC/HMAC-SHA256 primitives, wired into the live 1-on-1 message path, with Signal-algorithm Safety Numbers and a self-verifying cryptographic self-test. |
| [E2EE Media Pipeline & Encrypted Backups](./architecture/e2ee-media.md) | AES-256-GCM encrypt/verify/decrypt on every real attachment sent, and PBKDF2-derived (Argon2id substitute) passphrase-encrypted database backups exported/restored via the OS share sheet and document picker. |
| [Zero-Knowledge Encrypted Push Notifications](./architecture/encrypted-push.md) | The encrypted push payload contract, an encrypted quick-reply path, and an App Group config plugin — plus an honest account of why the iOS NSE/Android background decryptor themselves are native platform code this environment can't build or verify, with reference (unbuilt) Swift/Kotlin showing the integration shape. |
| [Animated Stickers, Sticker Maker & GIFs](./architecture/stickers.md) | Real hand-authored `.tgs` (gzipped Lottie) stickers rendered via `lottie-react-native`, a pack manager with shareable deep links, and an in-app sticker maker using a manual lasso cutout as a real substitute for native ML subject segmentation. |
| [Production Status & Stories Pipeline](./architecture/stories-pipeline.md) | Adjacent-story image prefetching, video-clock-synced progress bars, a real per-post audience picker with Sender-Keys-based key distribution, read-receipts-aware view tracking, a Muted Updates accordion, and Save to Personal Archive. |
| [Backend & Cloud Infrastructure](./architecture/backend-infrastructure.md) | A precise specification of the WebSocket gateway/Redis/Postgres/Coturn/CDN backend this client already assumes and is built against (env vars, event contract, prekey-bundle/ciphertext-upload shapes) — plus a real client-side dynamic TURN credential refresh. No server code belongs in this client repo. |
| [Display Zoom, Text Scaling & Responsive Layout](./architecture/display-scaling.md) | An 80%–165% display scale engine synced to OS Dynamic Type/Display Size with a manual slider + presets, wired into message bubbles and the chat list with non-clipping layout fixes, plus a real tablet/foldable Master-Detail split view that reuses the live chat thread component. |

---

## ✍️ Mandatory Rule for Working Agents

> [!IMPORTANT]
> Whenever an agent or engineer implements a ticket or makes architectural changes:
> 1. Locate the corresponding markdown file in `docs/` (or create a new document if introducing a new subsystem).
> 2. Document the implementation details, state flow, API contracts, schemas, or component usage upon completion of the task.
> 3. Keep this index up to date.
