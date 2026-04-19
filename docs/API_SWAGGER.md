# API and Swagger

## Where to find API docs

- Swagger UI: `http://localhost:3001/docs`
- OpenAPI is generated from NestJS decorators in controllers.

## Auth in Swagger

1. Run `POST /auth/login`.
2. Copy `accessToken` from response.
3. Click `Authorize` in Swagger and paste token as Bearer.

Note: Refresh flow uses an httpOnly cookie and is not fully testable from pure token auth.

## Route groups (tags)

- `auth`, `auth-oauth`, `sessions`
- `users`
- `posts`, `comments`, `post-files`, `posts-moderation`
- `payments`
- `chats`
- `files`
- `admin-users`, `admin-posts`, `admin-comments`, `admin-files`
- `health`, `redis`, `metrics`

## Keeping docs actually

When you add or change a route:

1. Add `ApiOperation` with a short summary.
2. Add main `ApiResponse` codes (success + common errors).
3. Add `ApiParam`, `ApiQuery`, `ApiBody` for all inputs.
4. Verify endpoint in Swagger UI (`/docs`).

This keeps the docs useful for frontend and QA without extra manual documentation.
