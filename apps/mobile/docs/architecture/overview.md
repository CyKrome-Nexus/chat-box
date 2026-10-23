# System Architecture Overview

This document describes the high-level architecture, technology stack, and runtime design of the Chat Box application.

---

## 1. High-Level Topology

```mermaid
graph TD
    subgraph Client Application (React Native / Expo)
        UI["React Native UI / Reanimated"]
        State["Redux Toolkit (UI State)"]
        LocalDB["WatermelonDB / SQLite (Offline Store)"]
        Crypto["Signal Protocol / WebCrypto (E2EE)"]
        Network["WebSocket & Sync Engine"]
    end

    subgraph Cloud Infrastructure
        Gateway["Distributed WebSocket Gateway"]
        Redis["Redis Streams & Pub/Sub"]
        RelationalDB["PostgreSQL / CockroachDB"]
        ObjectStore["Cloudflare R2 / AWS S3 (Ciphertext Blobs)"]
        TURNMesh["Coturn Global STUN/TURN Cluster"]
    end

    UI <--> State
    State <--> LocalDB
    LocalDB <--> Crypto
    Crypto <--> Network
    Network <--> Gateway
    Gateway <--> Redis
    Gateway <--> RelationalDB
    Network <--> ObjectStore
    Network <--> TURNMesh
```

---

## 2. Core Architectural Pillars

1. **Offline-First Storage**: Instant 0ms read/write from local SQLite storage before any network request.
2. **Zero-Knowledge Security**: All messages, media, and voice notes are end-to-end encrypted with the Signal Protocol.
3. **High-Performance Motion**: 60/120fps gesture-driven animations with React Native Reanimated.
4. **Adaptive Communication**: WebRTC VoIP and video calling with adaptive bitrates and native OS integration (CallKit / Android Telecom).
