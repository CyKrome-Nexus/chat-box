# Deployment (Dokploy)

The API and web app each ship a multi-stage Dockerfile, built from the **repository root**. Dokploy
clones this (public) repository and builds each environment from its branch, so no registry
credentials are needed. MongoDB and Redis run as Dokploy-managed databases so they get backups and
monitoring.

| Branch | Environment | Dokploy project environment |
| ------ | ----------- | --------------------------- |
| `dev`  | Development | `dev`                       |
| `qa`   | QA          | `qa`                        |
| `main` | Production  | `production`                |

## 1. Databases

In your Dokploy project create:

1. **MongoDB** (v7 or v8) — note the internal connection URL. Enable scheduled backups to S3.
2. **Redis** (optional but recommended) — enables shared rate limits, presence and running more than
   one API replica.

## 2. API application

| Setting      | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Source       | Git `https://github.com/CyKrome-Nexus/chat-box.git`, branch per environment |
| Build        | Dockerfile `apps/api/Dockerfile`, context `.`                               |
| Port         | `4000`                                                                      |
| Domain       | e.g. `api.chatbox.example.com` (HTTPS, Let's Encrypt)                       |
| Health check | `GET /ready`                                                                |
| Volume       | mount a persistent volume at `/data/uploads` when `STORAGE_DRIVER=local`    |

Environment (see `apps/api/.env.example` for every option):

```env
NODE_ENV=production
TRUST_PROXY=true
PUBLIC_API_URL=https://api.chatbox.example.com
CORS_ORIGINS=https://chatbox.example.com
MONGODB_URI=mongodb://<user>:<password>@<mongo-service>:27017/chatbox?authSource=admin
REDIS_URL=redis://default:<password>@<redis-service>:6379
JWT_ACCESS_SECRET=<openssl rand -base64 48>
MESSAGE_ENCRYPTION_KEY=<openssl rand -base64 32>
COOKIE_SECURE=true
COOKIE_DOMAIN=.chatbox.example.com
ADMIN_EMAILS=you@example.com
STORAGE_DRIVER=local
EMAIL_SERVICE_KEY_ID=chatbox-production
EMAIL_SERVICE_PRIVATE_KEY=<base64 PKCS#8 P-256 private key>
```

Verification and password-reset emails are rendered and sent by the CyKrome core service
(`https://api.cykrome.com`) with the Chatbox template from `CyKrome-Email-Templates`. Each request is
signed with `EMAIL_SERVICE_PRIVATE_KEY`; the core service holds only the matching public key, registered
under `EMAIL_SERVICE_KEY_ID` (`chatbox-production`, `chatbox-qa` or `chatbox-dev`). To rotate a key,
generate a new pair, register the public key in the core service, deploy it, then update this variable.

> `MESSAGE_ENCRYPTION_KEY` encrypts every stored message. Back it up somewhere safe — losing it makes
> existing messages unreadable — and never commit it.

## 3. Web application

| Setting     | Value                                         |
| ----------- | --------------------------------------------- |
| Source      | Git, same repository and branch as the API    |
| Build       | Dockerfile `apps/web/Dockerfile`, context `.` |
| Environment | `API_URL=https://api.chatbox.example.com`     |
| Port        | `80`                                          |
| Domain      | e.g. `chatbox.example.com`                    |

`API_URL` is written into `/runtime-config.js` when the container starts, so the same image serves
every environment.

Serve the web app and API from sibling subdomains of the same registrable domain so the refresh
cookie stays first-party.

## 4. Mobile app

Set `EXPO_PUBLIC_API_URL` (and `EXPO_PUBLIC_WEB_URL` for invite links) in the EAS build profile or
`apps/mobile/.env`, then build with EAS (`eas build`) or locally (`pnpm --filter @chatbox/mobile ios`).
Push notifications need an EAS project id (`extra.eas.projectId`) plus APNs/FCM credentials in EAS;
optionally set `EXPO_ACCESS_TOKEN` on the API.

## 5. Calls behind strict NATs (TURN)

STUN works for most networks; corporate and mobile carrier NATs need TURN. Run
[coturn](https://github.com/coturn/coturn) with REST-API auth:

```conf
use-auth-secret
static-auth-secret=<same value as TURN_SECRET>
realm=chatbox.example.com
```

Then set `TURN_URLS=turn:turn.chatbox.example.com:3478,turns:turn.chatbox.example.com:5349` and
`TURN_SECRET` on the API. coturn needs host networking (UDP relay ports), so run it on the Dokploy
host directly or as a Compose service with `network_mode: host`.

## 6. First admin

List your email in `ADMIN_EMAILS` (it's applied at sign-up and on every login), or promote an existing
account from a machine that can reach the database:

```bash
MONGODB_URI=… pnpm --filter @chatbox/api admin:promote you@example.com
```

## 7. CI/CD

`.github/workflows/ci.yml` typechecks, tests and builds every PR. Pushes to `dev`, `qa` and `main`
also run `scripts/deploy.sh` once the repository variable `DEPLOY_ENABLED` is `true`. It calls the
environment's Dokploy deploy webhooks (Dokploy then rebuilds from the branch) and waits until the API
restarts and `GET /ready` succeeds.

| Kind      | Name                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| Secrets   | `DOKPLOY_WEBHOOK_{API,WEB}_{DEV,QA,PRODUCTION}` (Dokploy → app → Deployments → webhook URL) |
| Variables | `DEPLOY_ENABLED`, `API_URL_{DEV,QA,PRODUCTION}`                                             |

## Local production check

```bash
docker build -f apps/api/Dockerfile -t chatbox-api .
docker build -f apps/web/Dockerfile -t chatbox-web .
docker run -e API_URL=http://localhost:4000 -p 8080:80 chatbox-web
```
