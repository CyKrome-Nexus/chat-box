# Chat Box Documentation

Welcome to the comprehensive technical documentation for the **Chat Box** mobile and web application.

---

## 📚 Documentation Index

All features, architectural designs, protocols, and data models are organized within this directory:

| Guide | Description |
|---|---|
| [System Architecture](./architecture/overview.md) | High-level system architecture, state management, offline-first engine, and network topologies. |
| [Database & Offline-First](./architecture/database.md) | Local WatermelonDB / SQLite schemas, outbox queueing, and delta synchronization. |
| [End-to-End Encryption (E2EE)](./architecture/e2ee-security.md) | Signal Protocol (X3DH, Double Ratchet, Sender Keys), AES-256-GCM media encryption, and zero-knowledge push notifications. |
| [Chat & Messaging](./features/chat-messaging.md) | Real-time WebSocket messaging, message bubbles, long-press actions, reactions, quotes, and drafts. |
| [Voice, Video & Media](./features/voice-video-media.md) | Voice notes (live waveform), circular video notes, in-app camera, media editor, and stickers. |
| [Audio & Video Calling](./features/calling.md) | WebRTC VoIP calling, CallKit / Android Telecom integration, and Picture-in-Picture (PiP). |
| [Stories & Status](./features/status-stories.md) | 24-hour ephemeral status updates, prefetching, and privacy rules. |
| [Theming & Accessibility](./features/theming-customization.md) | Theme palette, OLED Black mode, chat wallpaper studio, and dynamic display zoom. |
| [Authentication & Profiles](./features/auth-profile.md) | Auth flows, session persistence, `@username` registry, and phone number privacy. |

---

## ✍️ Mandatory Rule for Working Agents

> [!IMPORTANT]
> Whenever an agent or engineer implements a ticket or makes architectural changes:
> 1. Locate the corresponding markdown file in `docs/` (or create a new document if introducing a new subsystem).
> 2. Document the implementation details, state flow, API contracts, schemas, or component usage upon completion of the task.
> 3. Keep this index up to date.
