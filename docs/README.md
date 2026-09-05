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

---

## ✍️ Mandatory Rule for Working Agents

> [!IMPORTANT]
> Whenever an agent or engineer implements a ticket or makes architectural changes:
> 1. Locate the corresponding markdown file in `docs/` (or create a new document if introducing a new subsystem).
> 2. Document the implementation details, state flow, API contracts, schemas, or component usage upon completion of the task.
> 3. Keep this index up to date.
