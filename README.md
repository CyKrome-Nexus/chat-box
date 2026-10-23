# Chatbox

Fast, private messaging — mobile app, website and API in one TypeScript monorepo.

| Path                | What it is                       | Stack                                                                          |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `apps/mobile`       | iOS / Android app                | Expo SDK 54, React Native 0.81, expo-router, Redux Toolkit, Reanimated, WebRTC |
| `apps/web`          | Web app + admin dashboard        | React 19, Vite, React Router, TanStack Query, Tailwind CSS 4, Motion           |
| `apps/api`          | REST + realtime API              | Node 22, Fastify 5, Socket.IO, MongoDB (Mongoose), optional Redis              |
| `packages/shared`   | API contract shared by every app | zod schemas, DTO types, socket event map                                       |
| `packages/tsconfig` | Shared TypeScript configs        |                                                                                |

## Getting started

Requirements: Node 22+, pnpm 12, MongoDB 7+ (or Docker), optionally Redis.

```bash
pnpm install
docker compose up -d          # local MongoDB + Redis (or use your own)

cp apps/api/.env.example apps/api/.env       # then fill in the secrets
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env

pnpm dev                      # API on :4000 and web on :5173
pnpm dev:mobile               # Expo dev server (use a dev build: `pnpm --filter @chatbox/mobile ios|android`)
```

Generate secrets for `apps/api/.env`:

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 32   # MESSAGE_ENCRYPTION_KEY
```

## Scripts

| Command                                                    | Description                                       |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `pnpm dev`                                                 | Run API and web in watch mode                     |
| `pnpm build`                                               | Build every app                                   |
| `pnpm typecheck`                                           | Type-check every package                          |
| `pnpm test`                                                | Run the API integration tests (in-memory MongoDB) |
| `pnpm format`                                              | Format with Prettier                              |
| `pnpm --filter @chatbox/api admin:promote you@example.com` | Grant the admin role                              |

## Documentation

- [Architecture](docs/architecture.md) — how the pieces fit, data flow, security model
- [API reference](docs/api.md) — REST endpoints and realtime events
- [Deployment](docs/deployment.md) — Dokploy setup, environment variables, TURN, backups
- [Mobile app internals](apps/mobile/docs/README.md)
