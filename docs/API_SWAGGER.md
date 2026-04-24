# API and Swagger Documentation

## Where to find API docs

- **Swagger UI:** `http://localhost:3001/docs`
- **OpenAPI JSON:** `http://localhost:3001/api-json`
- **Health Check:** `http://localhost:3001/health`
- **Prometheus Metrics:** `http://localhost:3001/metrics`

OpenAPI documentation is auto-generated from NestJS decorators in controllers.

---

## Quick Start: Testing with Swagger UI

1. Navigate to `http://localhost:3001/docs`
2. Run `POST /auth/login` with your credentials and x-device-id header
3. Copy the `accessToken` from the response
4. Click the **Authorize** button (top-right) and paste: `Bearer <accessToken>`
5. All protected endpoints are now accessible

**Note:** Refresh token operations use httpOnly cookies and require actual browser/client support.

---

## Route Groups (API Tags)

| Tag | Module | Operations |
|---|---|---|
| `auth` | Authentication | register, login, logout, refresh, email verify, password reset |
| `auth-oauth` | OAuth Integration | OAuth redirect and callback handling |
| `sessions` | Session Management | Get sessions, delete sessions |
| `users` | User Profiles | Get/update profile, change password, delete account |
| `posts` | Posts (Public) | CRUD posts, like posts, view paginated posts |
| `posts-moderation` | Posts (Moderation) | Staff review and status changes (MODERATOR only) |
| `comments` | Comments | CRUD comments, like comments, pagination |
| `chats` | Chat Management | Create chats, join/leave, manage members |
| `messages` | Messaging | Send/edit/delete messages, file attachments |
| `post-files` | Post Files | Link files to posts, manage post images |
| `files` | File Upload | Upload images and documents |
| `payments` | Payments | Create payments, webhooks (WayForPay) |
| `admin-users` | Admin Users | User management, roles, role history |
| `admin-posts` | Admin Posts | Bulk delete posts |
| `admin-comments` | Admin Comments | Retry failed moderation jobs |
| `admin-files` | Admin Files | Force delete files |
| `redis` | System Health | Redis connectivity check |

---

## Authentication Patterns

### Public Routes (No Auth Required)
- All `/auth/*` endpoints except logout/logout-all
- `GET /posts` (list public posts)
- `GET /posts/:id` (view post details)
- `GET /posts/:id/comments` (view comments)
- `GET /redis/health` (health check)

### Protected Routes (JWT Token Required)
```
Authorization: Bearer <accessToken>
```
- User operations: `GET /users/me`, `PATCH /users/me`, etc.
- Post creation: `POST /posts`
- Commenting: `POST /posts/:id/comments`
- Chat & messaging: `/chats/*`, `/messages/*`
- File uploads: `POST /files/:target/:type`
- Payments: `POST /payments`

### Refresh Token Routes (httpOnly Cookie)
These endpoints require the refresh token cookie from login response:
- `POST /auth/refresh` - Get new access token
- `POST /auth/logout` - Logout current session
- `POST /auth/logout-all` - Logout all sessions
- `GET /auth/sessions/me` - List sessions
- `DELETE /auth/sessions/*` - Delete sessions

### Role-Based Routes (Admin/Moderator)
```
Authorization: Bearer <accessToken>
+ UserRoles: ADMIN or MODERATOR
```
- `/admin/users/*` - User management (ADMIN)
- `/admin/posts/*` - Post deletion (ADMIN)
- `/admin-comments/*` - Comment retry (ADMIN)
- `/admin/files/*` - File management (ADMIN)
- `/staff/posts/*` - Post moderation (MODERATOR)
- `DELETE /comments/moderate` - Batch delete comments (MODERATOR)

---

## File Upload Contract

### Upload Endpoints
- `POST /files/:target/images` - Upload images (JPEG, PNG, GIF, WebP)
- `POST /files/:target/documents` - Upload documents (PDF, DOC, DOCX)

### Supported Targets
| Target | Use Case | resourceId | Folder |
|---|---|---|---|
| `post` | Post images/docs | Required (postId) | `posts` |
| `chat` | Message attachments | Required (chatId) | `chat` |
| `profile` | Profile photos | Optional | `profile` |

### Constraints
- **Images:** Max 5 MB each, up to 10 files per request
- **Documents:** Max 20 MB each, up to 5 files per request
- **Server resolves storage:** Client sends files, server determines Cloudinary folder

### After Upload
1. Server returns file metadata (url, storageKey, size, etc.)
2. For posts: Call `POST /posts/:postId/files/link` with file URLs
3. For chats: Files are automatically embedded in message
4. For profiles: Use directly in user profile update

---

## OAuth Flow

### Step 1: Redirect User to OAuth Provider
```
GET /auth/:provider?redirectTo=<frontend-url>
Headers: x-device-id: <uuid> or query param: deviceId=<uuid>
```

Supported providers: `google`, `github` (configurable)

### Step 2: OAuth Provider Redirects Back
```
GET /auth/:provider/callback?code=<code>&state=<state>&error=<error>
```

Automatically handles:
- Authorization code exchange
- Token refresh rotation
- User creation/upsert
- Session creation with refresh token cookie
- Redirect to frontend with authentication

---

## Request/Response Patterns

### Pagination
```
GET /posts?page=1&limit=20
GET /posts?page=1&limit=20&search=garden&status=APPROVED

Response: { data: [...], pagination: { page, limit, total, totalPages } }
```

### Cursor-Based Pagination (Messages)
```
GET /chats/:chatId/messages?cursor=<timestamp>&limit=20

cursor: ISO timestamp of the oldest message on current page (leave empty for first page)
Response: { data: [...], pagination: { cursor, hasMore } }
```

### Idempotency (POST/Payment Endpoints)
```
POST /payments
Headers: Idempotency-Key: unique-key-123

Same request with same key returns cached result
```

### Sorting & Filtering
```
GET /staff/posts?page=1&limit=20&sortBy=targetDate&sortOrder=asc&status=PENDING_REVIEW
GET /posts/1/comments?page=1&limit=20&sort=newest
```

---

## Common Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["Field validation error"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "error": "Too Many Requests"
}
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|---|---|---|
| `POST /auth/register` | 3 requests | 60 seconds |
| `POST /auth/login` | 5 requests | 60 seconds |
| `POST /auth/resend/verification` | 3 requests | 60 seconds |
| `POST /auth/reset-password` | 3 requests | 60 seconds |
| `POST /payments/anonymous` | Custom (IP-based) | Per IP |
| `POST /payments/webhook/wayforpay` | Custom (webhook) | Per IP |
| Other endpoints | No limit | — |

---

## Keeping Docs Synchronized

When adding or modifying a route:

1. **Add Swagger decorator** in controller:
   ```typescript
   @ApiOperation({ summary: 'Clear, concise action description' })
   @ApiResponse({ status: 200, description: 'Success', type: ResponseDto })
   @ApiResponse({ status: 400, description: 'Bad request', type: ErrorDto })
   @ApiParam({ name: 'id', type: String, description: 'Resource ID' })
   @ApiQuery({ name: 'limit', required: false, type: Number })
   @ApiBody({ type: CreateDto })
   @ApiHeader({ name: 'x-device-id', description: 'Device UUID', required: true })
   ```

2. **Test in Swagger UI** (`/docs`):
   - Verify parameters, request/response examples
   - Check that auth requirements are clear
   - Verify status codes match implementation

3. **Update this file** if adding complex workflows or non-obvious patterns

4. **Update Postman Collection** (`trust-posts-postman-collection.json`):
   - Add example request body
   - Document required/optional fields
   - Add description of endpoint purpose
   - Test that endpoint works end-to-end

---

## WebSocket Connections (Chat Real-time)

Socket.IO events are documented separately in [CHAT.md](CHAT.md).

Key events:
- `message:send` - Send message to chat
- `message:edit` - Edit message
- `message:delete` - Delete message
- `typing:start` / `typing:stop` - Typing indicators
- `chat:marked-read` - Chat read status

---

## Testing with Postman

1. Import `trust-posts-postman-collection.json` into Postman
2. Set `baseUrl` environment variable or use collection variable
3. Run `auth/login` → copy `accessToken` → use in other requests
4. All variables (chatId, postId, messageId, etc.) can be auto-filled from responses
5. Use "Tests" tab in Postman for response validation

---

## References

- [NestJS Swagger Plugin](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [WayForPay Payment Integration](docs/README.md#payments)
- [Chat System Architecture](CHAT.md)
