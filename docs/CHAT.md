# Chat System

## Overview

The chat module provides realtime messaging between users with support for text,
file attachments (images and documents), message editing, soft deletion, and
typing indicators. It is built on a hybrid HTTP + WebSocket architecture:
file uploads go through REST, everything else goes through Socket.IO.

---

## Module Structure

```
src/modules/
├── chat/           — chat entity CRUD, room management, WebSocket gateway
│   ├── chat.controller.ts      REST: create, get, join, leave, delete, mark-read
│   ├── chat.gateway.ts         Socket.IO: all realtime events
│   ├── services/chat.service.ts
│   └── repos/chat.repo.ts
├── message/        — message lifecycle, file attachment, soft-delete
│   ├── message.controller.ts   REST: get messages, create (with files), edit, delete
│   ├── services/message.service.ts
│   └── repos/message.repo.ts
├── socket/         — socket registry & room-scoped emit helpers
│   └── socket.module.ts
└── maintenance/
    └── jobs/deleted-messages-cleanup.job.ts  — weekly hard-delete of soft-deleted messages
```

---

## Chat Types

| Type      | Description                               |
|-----------|-------------------------------------------|
| `PRIVATE` | Two users; cannot be joined by others     |
| `GROUP`   | Open; members can join / leave            |
| `POST`    | Automatically created per post; author gets added on first join |

---

## Database Schema (relevant tables)

### `chats`
| Column      | Type       | Notes                        |
|-------------|------------|------------------------------|
| `id`        | UUID       | Primary key                  |
| `type`      | enum       | PRIVATE / GROUP / POST       |
| `title`     | text?      | Group/post chats only        |
| `updated_at`| timestamp  | Bumped on every new message  |

### `messages`
| Column       | Type       | Notes                                              |
|--------------|------------|----------------------------------------------------|
| `id`         | UUID       |                                                    |
| `chat_id`    | UUID FK    |                                                    |
| `sender_id`  | UUID FK    |                                                    |
| `content`    | text?      | Nullable — file-only messages have no content      |
| `type`       | enum       | TEXT / FILE / MIXED / SYSTEM                       |
| `status`     | enum       | SENDING / SENT / FAILED                            |
| `is_delete`  | boolean    | Soft-delete flag (default false)                   |
| `deleted_at` | timestamp? | Set when `is_delete` is flipped to true            |
| `edited_at`  | timestamp? | Set on every content edit                          |

### `chat_files`
| Column         | Type    | Notes                                     |
|----------------|---------|-------------------------------------------|
| `id`           | UUID    |                                           |
| `message_id`   | UUID FK | CASCADE on message delete                 |
| `file_type`    | enum    | IMAGE / VIDEO / DOC                       |
| `url`          | varchar | Cloudinary CDN URL                        |
| `storage_key`  | varchar | Used for storage deletion                 |
| `mime_type`    | varchar |                                           |
| `size`         | int     | Bytes                                     |
| `original_name`| varchar |                                           |

---

## REST API

| Method   | Path                            | Description                                      |
|----------|---------------------------------|--------------------------------------------------|
| `POST`   | `/chats`                        | Create private or group chat                     |
| `POST`   | `/chats/posts/:postId/chat`     | Create or get a post chat                        |
| `GET`    | `/chats`                        | List user's chats (paginated)                    |
| `GET`    | `/chats/:chatId`                | Get single chat with members                     |
| `POST`   | `/chats/:chatId/join`           | Join a group chat                                |
| `POST`   | `/chats/:chatId/leave`          | Leave a chat                                     |
| `DELETE` | `/chats/:chatId`                | Remove self from chat                            |
| `POST`   | `/chats/:chatId/read`           | Mark all messages as read                        |
| `GET`    | `/chats/:chatId/messages`       | Cursor-based paginated message history           |
| `POST`   | `/chats/:chatId/messages`       | Send message with optional file attachments      |
| `PATCH`  | `/messages/:messageId`          | Edit message content                             |
| `DELETE` | `/messages/:messageId`          | Soft-delete a message                            |
| `DELETE` | `/files/:fileId`                | Delete a single attachment                       |

Message list uses **cursor-based pagination** (`?cursor=<ISO timestamp>&limit=20`).
The cursor points to the `createdAt` of the oldest message on the current page.

---

## WebSocket (Socket.IO)

**Namespace:** `/chat`  
**Auth:** JWT token passed via `auth: { token }` at connection time.

### Client → Server events

| Event            | Payload                              | Description                         |
|------------------|--------------------------------------|-------------------------------------|
| `chat:join`      | `{ chatId }`                         | Join Socket.IO room, get history    |
| `chat:leave`     | `{ chatId }`                         | Leave room                          |
| `message:send`   | `{ chatId, content? }`               | Send text message (WS path)         |
| `message:edit`   | `{ messageId, newContent }`          | Edit own message                    |
| `message:delete` | `{ messageId }`                      | Soft-delete own message             |
| `chat:typing`    | `{ chatId, isTyping }`               | Typing indicator heartbeat          |
| `chat:read`      | `{ chatId }`                         | Notify others that messages are read|

### Server → Client events

| Event            | Payload                                     | Trigger                              |
|------------------|---------------------------------------------|--------------------------------------|
| `connected`      | `{ userId, socketId }`                      | On successful connection             |
| `chat:upserted`  | `{ chat }`                                  | Room created or updated; sent to all members — add or merge room in local state without a fetch |
| `message:new`    | `{ chatId, message }`                       | Any new message (WS or HTTP/files)   |
| `message:edited` | `{ chatId, message }`                       | Content or type change               |
| `message:deleted`| `{ chatId, messageId, timestamp }`          | Soft-delete of message               |
| `user:joined`    | `{ userId, chatId, timestamp }`             | User joined the room                 |
| `user:left`      | `{ userId, chatId, timestamp }`             | User left the room                   |
| `user:typing`    | `{ userId, chatId, isTyping, timestamp }`   | Typing indicator                     |
| `chat:read`      | `{ userId, chatId, timestamp }`             | Messages read                        |

`message:new` is emitted by `MessageService.sendMessage` for **all** send paths
(WS text and REST with files), so clients always receive realtime updates
regardless of transport.

---

## Send Flow

### Text-only (WebSocket)
```
Client → WS message:send
  └─ ChatGateway.handleSendMessage
       └─ MessageService.sendMessage
            ├─ Validate membership
            ├─ repo.createMessage (transaction: insert message + update chat.updatedAt)
            ├─ socketService.emitToRoom → message:new  (broadcast to room)
            └─ return message (WS callback → sender's local state)
```

### With files (HTTP multipart)
```
Client → POST /chats/:chatId/messages  (FormData: content? + files[])
  └─ MessageController.createMessage
       └─ MessageService.sendMessage
            ├─ Validate membership
            ├─ filesService.upload → Cloudinary
            ├─ repo.createMessage (transaction: insert message + attachments + update chat.updatedAt)
            ├─ socketService.emitToRoom → message:new  (broadcast to room)
            └─ return message (HTTP 201 → sender's local state via upsertMessage)
```

On Cloudinary upload success but DB failure, uploaded files are cleaned up
before the error is propagated.

---

## Soft Delete & Cleanup

Deleting a message sets `is_delete = true` and `deleted_at = now()`.
Files are **not** removed immediately — the weekly cleanup job handles that.

### DeletedMessagesCleanupJob
- **Schedule:** every Sunday at 02:15 (Europe/Kyiv) — `0 15 2 * * 0`
- **Batch limit:** `MAINTENANCE_DELETED_MESSAGES_CLEANUP_BATCH_LIMIT` env var (default: **200**)
- **Logic:**
  1. Select up to `batchLimit` messages where `is_delete = true`, ordered by `deleted_at ASC` (oldest first).
  2. In a single transaction: hard-delete their `chat_files` rows, then hard-delete the messages.
  3. Cloudinary files whose `storage_key` no longer exists in `chat_files` are picked up by the existing `OrphanFilesJob`.

To change the batch size without redeploying, update the env variable.

---

## Caching

`MessageService.getMessages` and `ChatService.getChat` / `getUserChats` cache
results in Redis with short TTLs (messages: 15 s, chats: 30 s).

On every chat create or member change the relevant user-chats cache keys are
invalidated immediately, and a `chat:upserted` WebSocket event is emitted to
all members so clients receive the updated room state in real time without
needing a follow-up `GET /chats` request.

---

## Security

- All WS events require a valid JWT (`SocketAuthGuard`).
- `chat:join` verifies the requesting user is a member before adding them to the Socket.IO room.
- `message:edit` / `message:delete` check `senderId === userId` or `ADMIN` role.
- File attachment deletion checks the same ownership rule.
- `chatId` in edit/delete broadcasts is derived from the persisted entity, not from client input, preventing cross-chat spoofing.

---

## Rating: 7 / 10

### Strengths
- Hybrid transport: plain text goes over WS (low latency), file uploads go over HTTP (streaming, chunked).
- Single emit point in `MessageService.sendMessage` ensures realtime delivery for **all** send paths.
- Cursor-based pagination — correct approach for a realtime feed.
- Soft delete with a scheduled batch cleanup — no cascading deletes on hot path.
- Ownership + role checks on every mutating operation.
- Typed Socket.IO payloads match between gateway and UI client.

### What would push it to 9–10
- **Read receipts** — `markChatAsRead` exists but doesn't persist per-user state.
- **Unread count** — no counter per-user per-chat; would be needed for a real inbox.
- **Message reactions** — common expectation in modern chat.
- **Optimistic UI + retry** — UI sends WS message and waits for callback; no retry on failure.
- **Cache invalidation on write** — currently waits for TTL expiry; a targeted invalidation after send would eliminate the 15 s stale window for new sessions.
- **File soft-delete from storage** — Cloudinary files are only removed by the orphan job, not immediately on message delete (intentional trade-off, but worth noting).
- **E2E test coverage** for the realtime flow (WS join → send → broadcast → receive).
