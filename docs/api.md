# API reference

Base URL: `${PUBLIC_API_URL}/v1`. JSON in and out; errors are `{ "error": { "code", "message", "details?" } }`.
Authenticated routes need `Authorization: Bearer <accessToken>`. Request/response types live in
`packages/shared` — the tables below name the schema or DTO.

## Auth — `/auth`

| Method | Path                  | Body                                              | Returns                              |
| ------ | --------------------- | ------------------------------------------------- | ------------------------------------ |
| POST   | `/register`           | `registerSchema` (+ `deviceName`, `platform`)     | `AuthResponse` (201)                 |
| POST   | `/login`              | `loginSchema` — email, phone (E.164) or @username | `AuthResponse`                       |
| POST   | `/social`             | `socialLoginSchema` — provider ID/access token    | `AuthResponse`                       |
| POST   | `/refresh`            | `{ refreshToken }` or the `chatbox_rt` cookie     | `AuthTokens` (rotated)               |
| POST   | `/logout` 🔒          | —                                                 | 204                                  |
| POST   | `/password/forgot`    | `{ identifier }`                                  | 202 (always, no account enumeration) |
| POST   | `/password/reset`     | `{ identifier, code, password }`                  | 204, signs out every session         |
| POST   | `/password/change` 🔒 | `{ currentPassword?, newPassword }`               | 204, signs out other sessions        |
| GET    | `/sessions` 🔒        | —                                                 | `{ items: SessionInfo[] }`           |
| DELETE | `/sessions/:id` 🔒    | —                                                 | 204                                  |
| POST   | `/account/delete` 🔒  | `{ password? }`                                   | 204                                  |

Browsers send `X-Auth-Mode: cookie`: the refresh token is then set as an `httpOnly` cookie and returned
as an empty string in the body.

## Users & contacts 🔒

| Method       | Path                                     | Notes                                                     |
| ------------ | ---------------------------------------- | --------------------------------------------------------- |
| GET / PATCH  | `/users/me`                              | `updateProfileSchema` (name, about, handle, email, phone) |
| PATCH        | `/users/me/privacy`                      | `updatePrivacySchema`                                     |
| PUT          | `/users/me/avatar`                       | multipart `file` (image, ≤ 5 MB)                          |
| GET          | `/users/handle-availability?handle=`     | `{ available }`                                           |
| GET          | `/users/search?q=`                       | name or `@handle` prefix                                  |
| POST         | `/users/discover`                        | `{ phones[], emails[] }` → registered, discoverable users |
| GET          | `/users/:id`, `/users/by-handle/:handle` | `PublicUser`, privacy-filtered for the viewer             |
| PUT / DELETE | `/users/:id/block`                       | block / unblock                                           |
| GET          | `/users/blocked`                         |                                                           |
| GET / POST   | `/contacts`                              | list / add `{ userId, nickname? }`                        |
| DELETE       | `/contacts/:userId`                      |                                                           |

## Conversations 🔒

| Method         | Path                                                   | Notes                                                 |
| -------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| GET            | `/conversations`                                       | every visible conversation for the user               |
| POST           | `/conversations/direct`                                | `{ userId }` → get-or-create                          |
| POST           | `/conversations/group`                                 | `createGroupSchema`                                   |
| GET / PATCH    | `/conversations/:id`                                   | name, description, tags, settings, disappearing timer |
| PUT            | `/conversations/:id/avatar`                            | multipart `file`                                      |
| DELETE         | `/conversations/:id?scope=me\|everyone`                | clear for me, or delete group (owner)                 |
| POST           | `/conversations/:id/leave`                             | ownership passes to an admin, then the oldest member  |
| PUT            | `/conversations/:id/mute`                              | `{ mutedUntil: ISO \| null }`                         |
| POST           | `/conversations/:id/members`                           | `{ userIds[] }`                                       |
| PATCH / DELETE | `/conversations/:id/members/:userId`                   | promote/demote, remove                                |
| POST / DELETE  | `/conversations/:id/invite`                            | create/reset or revoke the invite code                |
| POST           | `/conversations/:id/read`                              | `{ messageId }`                                       |
| GET            | `/conversations/:id/messages?before=&after=&limit=`    | `Page<Message>`, chronological                        |
| GET            | `/conversations/:id/media?kind=media\|document\|audio` | shared media                                          |
| GET / POST     | `/invites/:code`, `/invites/:code/join`                | preview / join                                        |

## Messages 🔒

| Method | Path                               | Notes                                                                           |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------- |
| POST   | `/messages`                        | `sendMessageSchema`; idempotent per `clientId` (also available over the socket) |
| PATCH  | `/messages/:id`                    | edit text within 15 minutes                                                     |
| DELETE | `/messages/:id?scope=me\|everyone` | everyone: sender within 48 h, or a group admin                                  |
| PUT    | `/messages/:id/reaction`           | `{ emoji \| null }`                                                             |
| PUT    | `/messages/:id/vote`               | `{ optionIds[] }`                                                               |
| POST   | `/messages/:id/forward`            | `{ conversationIds[] }`                                                         |

## Media, calls, stories, devices 🔒

| Method       | Path                 | Notes                                                                         |
| ------------ | -------------------- | ----------------------------------------------------------------------------- |
| POST         | `/media`             | multipart `file` (≤ 50 MB) → `MediaUpload` — reference its `key` in a message |
| GET          | `/calls`             | call log from the caller's perspective                                        |
| GET          | `/calls/ice-servers` | STUN + short-lived TURN credentials                                           |
| GET / POST   | `/stories`           | feed (own + contacts', last 24 h) / create                                    |
| POST / GET   | `/stories/:id/views` | mark viewed / list viewers (author only)                                      |
| DELETE       | `/stories/:id`       |                                                                               |
| PUT / DELETE | `/devices`           | register / remove an Expo push token                                          |

## Admin 🔒 (role `admin`)

`GET /admin/stats`, `GET /admin/users`, `PATCH /admin/users/:id` (`disabled`, `role`),
`GET /admin/conversations`, `GET /admin/messages?conversationId=` (metadata only).

## Realtime

Connect Socket.IO to `PUBLIC_API_URL` with `auth: { token: accessToken }`. Event payloads are typed in
`packages/shared/src/socket.ts`.

| Client → server                                                                                                              | Ack                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `message:send`, `call:invite`, `presence:subscribe`                                                                          | `{ ok: true, data } \| { ok: false, error }` |
| `message:read`, `message:delivered`, `typing:update`, `call:signal`, `call:accept`, `call:decline`, `call:end`, `call:media` | —                                            |

Server → client: `message:new`, `message:updated`, `message:deleted`, `message:reactions`,
`poll:updated`, `receipt:update`, `typing:update`, `presence:update`, `conversation:upsert`,
`conversation:removed`, `story:new`, `call:incoming`, `call:signal`, `call:state`, `call:media`,
`session:revoked`.

## Health

`GET /health` (liveness) and `GET /ready` (database connected) — unauthenticated, not rate limited.
