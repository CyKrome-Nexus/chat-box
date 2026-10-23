# Chat Box Documentation

Welcome to the comprehensive technical documentation for the **Chat Box** mobile and web application.

---

## 📚 Documentation Index

Feature-level notes for the mobile app. Backend integration, the API contract, sync, calling and the
security model are documented at the repository root: [architecture](../../../docs/architecture.md),
[API reference](../../../docs/api.md) and [deployment](../../../docs/deployment.md).

| Guide | Description |
|---|---|
| [System Architecture](./architecture/overview.md) | High-level system architecture, state management, offline-first engine, and network topologies. |
| [Chat & Messaging](./features/chat-messaging.md) | Real-time WebSocket messaging, message bubbles, long-press actions, reactions, quotes, and drafts. |
| [Voice, Video & Media](./features/voice-video-media.md) | Voice notes (live waveform), circular video notes, in-app camera, media editor, and stickers. |
| [Stories & Status](./features/status-stories.md) | 24-hour ephemeral status updates, prefetching, and privacy rules. |
| [Theming & Accessibility](./features/theming-customization.md) | Theme palette, OLED Black mode, chat wallpaper studio, and dynamic display zoom. |
| [Authentication & Profiles](./features/auth-profile.md) | Auth flows, session persistence, `@username` registry, and phone number privacy. |
| [UI Components & Styling](./architecture/ui-components.md) | React Native style conventions (border radius, conditional styles, SVG icons, themed text). |
| [Fonts & Splash Screen](./architecture/fonts-and-splash.md) | Custom font loading via `expo-font` and the splash screen readiness gate. |
| [Media & File Attachments](./architecture/media-attachments.md) | Attachment sheet, camera/gallery/document/location pickers, media bubbles, fullscreen pinch-to-zoom viewer. |
| [Voice & Audio Messaging](./architecture/voice-messages.md) | Recording (mic button, timer, slide-to-cancel), waveform bubbles, single-track playback. |
| [Advanced Voice Note Studio](./architecture/voice-note-studio.md) | Swipe-up-to-lock, real live waveform capture, handsfree pause/preview/send, scrubbing, playback speed, continuous playback. |
| [Emoji Picker](./architecture/emoji-picker.md) | Categorized emoji panel, search, recents, cursor-position insertion. |
| [Device Contacts](./architecture/contacts.md) | expo-contacts sync, registered-status lookup, search, add-contact modal, start-chat flow. |
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
| [Animated Stickers, Sticker Maker & GIFs](./architecture/stickers.md) | Real hand-authored `.tgs` (gzipped Lottie) stickers rendered via `lottie-react-native`, a pack manager with shareable deep links, and an in-app sticker maker using a manual lasso cutout as a real substitute for native ML subject segmentation. |
| [Display Zoom, Text Scaling & Responsive Layout](./architecture/display-scaling.md) | An 80%–165% display scale engine synced to OS Dynamic Type/Display Size with a manual slider + presets, wired into message bubbles and the chat list with non-clipping layout fixes, plus a real tablet/foldable Master-Detail split view that reuses the live chat thread component. |
| [Theming Engine, Accent Colors & Chat Wallpaper Studio](./architecture/theming-engine.md) | A real instant-switching theme Context (Light/Dark/OLED Black/Sepia), a customizable accent color (8 presets + validated hex) wired into outgoing bubbles/tab bar/primary buttons, and a Chat Wallpaper Studio (vector doodle, solid, 21 gradients, gallery photo with real blur/dim sliders) with global + per-chat overrides. |
| [Sound Effects, Haptics & Custom Notification Tones](./architecture/sound-haptics.md) | Real procedurally-synthesized WAV sound effects with proper audio-session ducking (never interrupts background music), `expo-haptics` wired into tab bar/toggles/reaction pills/swipe-to-reply/slide-to-cancel/delete at the ticket's exact impact levels, and a per-contact custom message tone/call ringtone/vibration pattern system. |
| [Multi-Account Profile Switching Engine](./architecture/multi-account.md) | Up to 5 linked accounts, each with a genuinely separate SQLite database, Signal Protocol identity keystore, and session, switchable with one tap via a real account-scoping mechanism in each storage layer — plus an Accounts switcher UI and a dedicated Add Account flow. |
| [First Real-Device Boot: Fixes](./architecture/first-real-boot-fixes.md) | Four previously-dormant bugs found and fixed by actually running the app on a device for the first time: an eager CallKeep permission request blocking the first frame, an invalid SecureStore key silently hanging login forever, a Google Sign-In hook crashing on render, and an infinite redirect loop. |
| [SSOT App Versioning Engine](./architecture/versioning.md) | `package.json`'s version as the sole source of truth, propagated through a dynamic `app.config.ts` into deterministic Android `versionCode`/iOS `buildNumber` (verified via `expo prebuild`), a runtime `useAppVersionInfo()` hook powering Settings → Help → About, and `npm run version:patch/minor/major` scripts for bump + commit + tag. |

---

## ✍️ Mandatory Rule for Working Agents

> [!IMPORTANT]
> Whenever an agent or engineer implements a ticket or makes architectural changes:
> 1. Locate the corresponding markdown file in `docs/` (or create a new document if introducing a new subsystem).
> 2. Document the implementation details, state flow, API contracts, schemas, or component usage upon completion of the task.
> 3. Keep this index up to date.
