# Database & Offline-First Sync Architecture

## 1. Local Database Schema (WatermelonDB / SQLite)
The application maintains an embedded local database partitioned across the following collections:
- `conversations`: Thread metadata, unread counts, pinned state, archive state, and draft text.
- `messages`: Message payloads, timestamps, sender/recipient IDs, delivery status, and media metadata.
- `contacts`: Synchronized user profiles, public keys, and presence cache.
- `call_logs`: Audio/video call history, direction, duration, and status.

## 2. Outbox & Synchronization State Machine
- When a user sends a message, it is written to the local database with `status: 'pending'`.
- The synchronization queue flushes pending actions over the active WebSocket.
- Incoming messages are written locally and trigger reactive UI re-renders.
