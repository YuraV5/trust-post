# Architecture Summary

## Goal

Provide a production-style backend for a social platform with strong modular boundaries,
reliable background processing, and observable runtime behavior.

## High-Level Components

- **API Layer** (NestJS): REST controllers, DTO validation, guards (auth, roles, ownership, throttle)
- **Domain Modules**: auth, users, posts, comments, chat, payments, files, admin, maintenance (18 total)
- **Data Layer**: Prisma + PostgreSQL (repository pattern, soft deletes, compound indexes)
- **Cache Layer**: Redis (cache-aside pattern, TTL per entity type, session store)
- **Async Layer**: BullMQ + Redis (queues with DLQ per queue, exponential backoff, metrics)
- **Realtime Layer**: Socket.io 4 with Redis adapter (horizontal WS scaling across pods)
- **Storage/CDN Layer**: Cloudinary (image/document upload, CDN delivery, metadata stored in DB)
- **AI Layer**: Google Gemini via extensible `core-agents` provider registry
- **Payment Layer**: WayForPay webhook handling (signature validation, idempotency, attempt tracking)
- **Observability Layer**: Prometheus + Grafana (6 dashboards) + Loki + Winston structured logs

## Runtime Flow

1. Client calls REST or WebSocket endpoint.
2. Request passes `ThrottlerGuard` (Redis-backed rate limits) → `AccessTokenGuard` → `RolesGuard` / `OwnershipGuard`.
3. Controller delegates to a service; service reads from Redis cache first, falls back to Prisma.
4. Heavy or non-blocking work (email, moderation, metrics) is pushed to a BullMQ queue and processed asynchronously.
5. Real-time events (chat messages, typing indicators) are emitted via Socket.io; Redis adapter broadcasts to all app nodes.
6. Prometheus metrics and Winston logs are emitted per request and per job.

## WebSocket Scaling

Socket.io uses `@socket.io/redis-adapter` with two dedicated Redis connections (pub/sub isolation).
This allows multiple app replicas to share socket rooms — a message emitted on replica A reaches
clients connected to replica B without any additional coordination layer.

## Caching Strategy

- **Pattern**: cache-aside (check Redis → miss → query DB → write Redis)
- **Key convention**: `{entity}:{id}:{variant}` (e.g., `post:abc123:full`)
- **TTLs**: configured per entity type via `ConfigService`
- **Invalidation**: explicit key deletion on write/update/delete operations

## Async Job Reliability

Each BullMQ queue has a paired DLQ (`{queue}.dlq`). A job moves to the DLQ only after
all retry attempts are exhausted (default: 5 attempts, 3 s → exponential backoff).
DLQ depth is tracked as a Prometheus gauge; an alert fires when it exceeds the threshold.
Failed jobs are retained (last 50) for forensic inspection.

## Security Design

- **Auth**: JWT access (15 min) + refresh (7 d), device-scoped sessions, hashed refresh tokens
- **Passwords**: Argon2id — raw password never persisted or logged
- **Rate limiting**: custom Redis throttler with per-route overrides
- **Idempotency**: header-based interceptor caches responses for mutating and payment requests
- **OAuth CSRF**: state parameter validated on callback
- **Headers**: Helmet on all responses

## Key Reliability Practices

- Health checks: `/health/liveness` (app alive) and `/health/readiness` (DB + Redis reachable)
- Containerized environments with explicit service health checks in Docker Compose
- Structured logging with `requestId` correlation across async boundaries
- Monitoring stack (Prometheus + Loki + Alertmanager) with alert rules for DLQ growth and error rates
- CI pipeline: lint → format → unit tests → E2E tests → Docker build on every PR to main
