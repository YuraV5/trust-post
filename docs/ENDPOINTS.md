# Complete API Endpoints Reference

**Total Endpoints:** 69 routes across 18 controllers

---

## Table of Contents

1. [Authentication (10 routes)](#authentication)
2. [OAuth (2 routes)](#oauth)
3. [Sessions (4 routes)](#sessions)
4. [Users (4 routes)](#users)
5. [Posts - Public (9 routes)](#posts--public)
6. [Posts - Moderation/Staff (3 routes)](#posts--modulationstaf)
7. [Comments (6 routes)](#comments)
8. [Post Files (4 routes)](#post-files)
9. [Admin Files (2 routes)](#admin-files)
10. [Chat (9 routes)](#chat)
11. [Messages (5 routes)](#messages)
12. [File Upload (2 routes)](#file-upload)
13. [User Payments (3 routes)](#user-payments)
14. [Public Payments (2 routes)](#public-payments)
15. [Admin Users (7 routes)](#admin-users)
16. [Admin Comments (1 route)](#admin-comments)
17. [Health Checks (1 route)](#health-checks)

---

## Authentication

**Controller Path:** `/auth`  
**Module:** `auth/controllers/auth.controller.ts`  
**Auth:** Various (see below)

| # | Method | Endpoint | Summary | Auth | Throttle |
|---|--------|----------|---------|------|----------|
| 1 | POST | `/auth/register` | Register new user account | Public | 3/min |
| 2 | POST | `/auth/login` | User login with credentials | Public | 5/min |
| 3 | POST | `/auth/refresh` | Refresh access token | RefreshToken | — |
| 4 | POST | `/auth/logout` | Logout current session | RefreshToken | — |
| 5 | POST | `/auth/logout-all` | Logout all sessions | RefreshToken | — |
| 6 | GET | `/auth/verify-email/:uuid` | Verify email with token | Public | — |
| 7 | POST | `/auth/resend/verification` | Resend verification email | Public | 3/min |
| 8 | POST | `/auth/reset-password` | Request password reset | Public | 3/min |
| 9 | POST | `/auth/set-password/:uuid` | Set new password with token | Public | — |
| 10 | POST | `/auth/activate-account/:uuid` | Activate user account | Public | — |

---

## OAuth

**Controller Path:** `/auth/:provider`  
**Module:** `auth/oauth/controllers/oauth.controller.ts`  
**Auth:** Public

| # | Method | Endpoint | Summary | Notes |
|---|--------|----------|---------|-------|
| 11 | GET | `/auth/:provider` | Redirect to OAuth provider | Replace `:provider` with `google`, `github`, etc. x-device-id header required |
| 12 | GET | `/auth/:provider/callback` | OAuth callback handler | Automatic redirect from provider. Sets refresh token cookie. |

---

## Sessions

**Controller Path:** `/auth/sessions`  
**Module:** `auth/sessions/sessions.controller.ts`  
**Auth:** RefreshToken (requires refresh token cookie)

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 13 | GET | `/auth/sessions/me` | Get all active sessions |
| 14 | DELETE | `/auth/sessions/all` | Delete all sessions |
| 15 | DELETE | `/auth/sessions/all-except-current` | Delete all except current |
| 16 | DELETE | `/auth/sessions/:sessionId` | Delete specific session |

---

## Users

**Controller Path:** `/users`  
**Module:** `users/controllers/users.controller.ts`  
**Auth:** Protected (JWT)

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 17 | GET | `/users/me` | Get current user profile |
| 18 | PATCH | `/users/me` | Update profile (name, email, photo) |
| 19 | PATCH | `/users/me/password` | Change password |
| 20 | DELETE | `/users/me` | Delete user account permanently |

---

## Posts - Public

**Controller Path:** `/posts`  
**Module:** `posts/controllers/public-posts.controller.ts`  
**Auth:** Public (list/get), Protected (create/update/delete)

| # | Method | Endpoint | Summary | Auth | Idempotency |
|---|--------|----------|---------|------|-----------|
| 21 | POST | `/posts` | Create new post | Protected | Yes |
| 22 | GET | `/posts` | List public posts (paginated) | Public | — |
| 23 | GET | `/posts/my` | Get current user's posts | Protected | — |
| 24 | GET | `/posts/my/:id` | Get own post (any status) | Protected | — |
| 25 | GET | `/posts/:id` | Get post by ID | Public | — |
| 26 | PATCH | `/posts/:id` | Update post (owner only) | Protected | — |
| 27 | PATCH | `/posts/:id/status` | Update post status (owner) | Protected | — |
| 28 | DELETE | `/posts/:id` | Delete post (owner only) | Protected | — |
| 29 | POST | `/posts/:id/like` | Like/unlike post | Protected | — |

---

## Posts - Moderation/Staff

**Controller Path:** `/staff/posts`  
**Module:** `posts/controllers/staff-post.controller.ts`  
**Auth:** Protected + MODERATOR role

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 30 | GET | `/staff/posts` | Get posts for moderation (paginated) |
| 31 | PATCH | `/staff/posts/:id/status` | Update post review status |
| 32 | GET | `/staff/posts/:id/history` | Get post status history |

---

## Comments

**Controller Path:** `/posts/:postId/comments` and `/comments`  
**Module:** `posts/comments/comments.controller.ts`  
**Auth:** Public (get), Protected (create/edit/delete)

| # | Method | Endpoint | Summary | Auth |
|---|--------|----------|---------|------|
| 33 | POST | `/posts/:postId/comments` | Create comment | Protected |
| 34 | GET | `/posts/:postId/comments` | Get post comments (paginated) | Public |
| 35 | PATCH | `/comments/:id` | Edit comment (owner only) | Protected |
| 36 | DELETE | `/comments/:id` | Delete comment (owner only) | Protected |
| 37 | DELETE | `/comments/moderate` | Batch delete comments (moderator) | Protected + MODERATOR |
| 38 | POST | `/comments/:id/like` | Like/unlike comment | Protected |

---

## Post Files

**Controller Path:** `/posts`  
**Module:** `posts/posts-files/controllers/post-files.controller.ts`  
**Auth:** Public (get), Protected (create/update/delete)

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 39 | POST | `/posts/:postId/files/link` | Link uploaded files to post |
| 40 | GET | `/posts/:postId/files` | Get all files for post |
| 41 | PATCH | `/posts/:postId/files/:fileId/main` | Set file as main image |
| 42 | DELETE | `/posts/:postId/files/:fileId` | Delete file from post |

---

## Admin Files

**Controller Path:** `/admin/files`  
**Module:** `posts/posts-files/controllers/admin-files.controller.ts`  
**Auth:** Protected + ADMIN role

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 43 | DELETE | `/admin/files/posts/:postId` | Delete all files for post |
| 44 | DELETE | `/admin/files/:fileId` | Force delete specific file |

---

## Chat

**Controller Path:** `/chats`  
**Module:** `chat/chat.controller.ts`  
**Auth:** Protected (JWT)

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 45 | POST | `/chats` | Create private or group chat |
| 46 | POST | `/chats/posts/:postId/chat` | Create/get chat for post |
| 47 | GET | `/chats` | Get all chats (paginated) |
| 48 | GET | `/chats/:chatId` | Get specific chat |
| 49 | POST | `/chats/:chatId/join` | Join group chat |
| 50 | POST | `/chats/:chatId/leave` | Leave chat |
| 51 | POST | `/chats/:chatId/members/by-email` | Add member by email |
| 52 | DELETE | `/chats/:chatId` | Soft-delete chat for user |
| 53 | POST | `/chats/:chatId/read` | Mark all messages as read |

---

## Messages

**Controller Path:** Root (no prefix)  
**Module:** `message/message.controller.ts`  
**Auth:** Protected (JWT)

| # | Method | Endpoint | Summary | Idempotency |
|---|--------|----------|---------|------------|
| 54 | GET | `/chats/:chatId/messages` | Get messages (cursor-based) | — |
| 55 | POST | `/chats/:chatId/messages` | Send message with attachments | Yes |
| 56 | PATCH | `/messages/:messageId` | Edit message | — |
| 57 | DELETE | `/messages/:messageId` | Soft-delete message | — |
| 58 | DELETE | `/files/:fileId` | Delete message file | — |

---

## File Upload

**Controller Path:** `/files`  
**Module:** `files/controllers/files.controller.ts`  
**Auth:** Protected (JWT)

| # | Method | Endpoint | Summary | Constraints |
|---|--------|----------|---------|-----------|
| 59 | POST | `/files/:target/images` | Upload images | Max 5MB each, 10 files, JPEG/PNG/GIF/WebP |
| 60 | POST | `/files/:target/documents` | Upload documents | Max 20MB each, 5 files, PDF/DOC/DOCX |

**Targets:** `post` (postId required), `chat` (chatId required), `profile` (optional)

---

## User Payments

**Controller Path:** `/payments`  
**Module:** `payments/controllers/user-payments.controller.ts`  
**Auth:** Protected (JWT)

| # | Method | Endpoint | Summary | Idempotency |
|---|--------|----------|---------|------------|
| 61 | POST | `/payments` | Create payment request | Yes |
| 62 | POST | `/payments/:paymentId/regenerate-link` | Regenerate payment link | — |
| 63 | GET | `/payments/my` | Get user payments (paginated) | — |

---

## Public Payments

**Controller Path:** `/payments`  
**Module:** `payments/controllers/public-payments.controller.ts`  
**Auth:** Public (anonymous), Protected (webhook)

| # | Method | Endpoint | Summary | Idempotency |
|---|--------|----------|---------|------------|
| 64 | POST | `/payments/anonymous` | Create anonymous payment | Yes |
| 65 | POST | `/payments/webhook/wayforpay` | WayForPay webhook | Rate-limited |

---

## Admin Users

**Controller Path:** `/admin/users`  
**Module:** `admin/controllers/admin-users.controller.ts`  
**Auth:** Protected + ADMIN role

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 66 | GET | `/admin/users` | Get all users (paginated, filterable) |
| 67 | POST | `/admin/users` | Create user by admin |
| 68 | GET | `/admin/users/:id` | Get user details |
| 69 | PATCH | `/admin/users/:id/toggle-status` | Toggle user active status |
| 70 | PATCH | `/admin/users/:id/roles` | Update user role |
| 71 | GET | `/admin/users/:id/role-history` | Get user role history |
| 72 | DELETE | `/admin/users` | Bulk delete users |

---

## Admin Comments

**Controller Path:** `/admin`  
**Module:** `admin/controllers/admin-comments.controller.ts`  
**Auth:** Protected + ADMIN role

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 73 | POST | `/admin/retry-comments` | Retry failed comment moderation jobs |

---

## Admin Posts

**Controller Path:** `/admin/posts`  
**Module:** `admin/controllers/admin-posts.controller.ts`  
**Auth:** Protected + ADMIN role

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 74 | DELETE | `/admin/posts/remove` | Permanently delete posts (bulk) |

---

## Health Checks

**Controller Path:** `/redis`  
**Module:** `cache/controllers/health.controller.ts`  
**Auth:** Public

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 75 | GET | `/redis/health` | Redis connectivity check |

**Global Endpoints (outside /api/v1):**
- `GET /health` - Application health check
- `GET /metrics` - Prometheus metrics (text format)

---

## Summary by Category

| Category | Count | Protected | Public |
|----------|-------|-----------|--------|
| Authentication | 10 | 0 | 10 |
| OAuth | 2 | 0 | 2 |
| Sessions | 4 | 4 | 0 |
| Users | 4 | 4 | 0 |
| Posts | 12 | 7 | 5 |
| Comments | 6 | 5 | 1 |
| Chat | 9 | 9 | 0 |
| Messages | 5 | 5 | 0 |
| Files | 4 | 4 | 0 |
| Payments | 5 | 2 | 3 |
| Admin | 8 | 8 | 0 |
| Health | 1 | 0 | 1 |
| **TOTAL** | **75** | **48** | **27** |

---

## Authentication Summary

### Public Routes (No Auth)
- All `/auth/*` endpoints
- `GET /posts`, `GET /posts/:id`, `GET /posts/:id/comments`
- `GET /redis/health`
- `POST /payments/anonymous`, `POST /payments/webhook/wayforpay`

### Protected Routes (JWT Token)
```
Authorization: Bearer <accessToken>
```
- 48 routes (user operations, posts creation, chat, payments, admin operations)

### Refresh Token Routes (httpOnly Cookie)
```
Via httpOnly cookie set during login
```
- `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`
- `GET /auth/sessions/me`, `DELETE /auth/sessions/*`

### Role-Based Routes
```
Authorization: Bearer <accessToken>
+ Role: ADMIN or MODERATOR
```
- **ADMIN (10 routes):** Admin users, files, posts delete, comments retry
- **MODERATOR (4 routes):** Post moderation, comment moderation

---

## Key Patterns

### Idempotency (3 endpoints)
- `POST /posts` - Create post
- `POST /chats/:chatId/messages` - Send message
- `POST /payments` - Create payment
- `POST /payments/anonymous` - Anonymous payment

**Header:** `Idempotency-Key: <unique-string>`

### Rate Limiting
- `/auth/register` - 3 per minute
- `/auth/login` - 5 per minute
- `/auth/resend/verification` - 3 per minute
- `/auth/reset-password` - 3 per minute
- `/payments/anonymous` - Anonymous rate limit
- `/payments/webhook/wayforpay` - Webhook rate limit

### Ownership Guards (8 endpoints)
- Post CRUD: `/posts/:id`, `/posts/:id/status`
- Comments: `/comments/:id`
- Post files: `/posts/:postId/files/*`
- Message files: `/files/:fileId`

---

## Quick Reference by Use Case

### For Frontend

#### User Authentication
1. `POST /auth/register` - Create account
2. `POST /auth/login` - Get access token
3. `POST /auth/logout` - End session
4. `POST /auth/refresh` - Refresh token

#### Social Features
- Posts: `POST /posts`, `GET /posts`, `PATCH /posts/:id`
- Comments: `POST /posts/:id/comments`, `GET /posts/:id/comments`
- Likes: `POST /posts/:id/like`, `POST /comments/:id/like`

#### Chat & Messaging
- Create chat: `POST /chats`
- Send message: `POST /chats/:chatId/messages`
- Manage files: `POST /files/:target/:type`, `POST /posts/:postId/files/link`

#### Payments
- Create payment: `POST /payments` (auth) or `POST /payments/anonymous`
- Track payments: `GET /payments/my`

### For Admin Dashboard

#### User Management
- List users: `GET /admin/users`
- Create user: `POST /admin/users`
- Manage roles: `PATCH /admin/users/:id/roles`
- Delete users: `DELETE /admin/users`

#### Content Moderation
- Review posts: `GET /staff/posts`
- Change post status: `PATCH /staff/posts/:id/status`
- Delete posts: `DELETE /admin/posts/remove`
- Manage comments: `DELETE /comments/moderate`, `POST /admin/retry-comments`
- Manage files: `DELETE /admin/files/*`

---

## Testing

See [Postman Collection](trust-posts-postman-collection.json) for request examples.
See [API_SWAGGER.md](API_SWAGGER.md) for detailed patterns and error responses.