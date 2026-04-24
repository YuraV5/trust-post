# Trust-Post — Project Overview

A production-style social platform backend built with **NestJS 11** and **TypeScript 5**.  
Demonstrates modular architecture, reliable async processing, real-time communication, payment integration, and full observability.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11, TypeScript 5 (strict mode) |
| Database | PostgreSQL 15 via Prisma 6 (migrations, enums, indexes) |
| Cache / Sessions | Redis 7 (caching, BullMQ transport, session store) |
| Async Jobs | BullMQ 5 (queues, DLQ per queue, exponential backoff) |
| Real-time | Socket.io 4 with NestJS WebSocket Gateway |
| Auth | JWT (access + refresh tokens), Argon2 hashing, Google OAuth |
| File Storage | Cloudinary (CDN, image & document uploads) |
| Email | Resend SDK (transactional emails via queue) |
| Payments | WayForPay (webhook validation, order lifecycle) |
| AI | Google Gemini (comment moderation agent) |
| Observability | Prometheus + Grafana (6 dashboards) + Loki + Winston |
| Security | Helmet, CORS, rate limiting (custom Redis throttler) |
| Validation | class-validator, class-transformer, Joi (env schema) |
| API Docs | Swagger / OpenAPI (auto-generated from decorators) |
| Testing | Jest 30 + Supertest + Testcontainers (real DB/Redis in E2E) |
| CI/CD | GitHub Actions (lint → unit → E2E → Docker publish → release) |
| Runtime | Docker (multi-stage Alpine build, non-root user) |

---

## Project Structure

```
src/
├── app/                    # Bootstrap: global settings, Swagger setup
├── common/                 # Cross-cutting reusable primitives
│   ├── guards/             # AccessToken, RefreshToken, Ownership, Roles, SocketAuth
│   ├── decorators/         # @CurrentUser, @Roles, @Public, @RequireIdempotencyKey
│   ├── utils/              # IP masking, expiration parsing, name generation
│   └── validators/         # Regex patterns for DTO validation
├── configs/                # Typed env config (Joi schema + ConfigService factories)
├── infrastructure/         # Cross-cutting adapters and interceptors
│   ├── filters/            # Global exception filters (Prisma, HTTP, catch-all)
│   ├── health/             # Liveness and readiness endpoints
│   ├── http/               # Idempotency interceptor, throttling, request context
│   ├── metrics/            # Prometheus metrics service and /metrics controller
│   └── resend/             # Resend email client adapter
├── modules/                # Feature modules (18 total — see table below)
└── shared/                 # Foundational services used across modules
    ├── logger/             # Winston-based structured logger (DI token)
    ├── errors/             # Typed AppError classes (Bad Request, Not Found, etc.)
    └── context/            # Execution context carrier (requestId, userId)
```

---

## Modules

| Module | Responsibility | Key Patterns |
|---|---|---|
| **auth** | Register, login, email verify, password reset, Google OAuth | JWT access/refresh, device-scoped sessions, OAuth registry |
| **users** | User profiles, email state, role management | Repository pattern, soft-delete safe queries |
| **posts** | Post CRUD, lifecycle status, AI/human moderation queue | Paginated queries, status state machine |
| **comments** | Comment CRUD, soft delete, moderation | Tree structure, ownership guard |
| **likes** | Post and comment reactions | Upsert pattern, deduplicated metrics |
| **files** | File upload and deletion via Cloudinary | Ownership validation, CDN integration |
| **chat** | Real-time group and direct messaging | Socket.io gateway, room registry, REST + WS |
| **message** | Message CRUD with file attachments | Soft delete, cursor-based pagination |
| **payments** | WayForPay order creation and webhook handling | Webhook signature validation, idempotency |
| **emails** | Queue-based transactional email dispatch | Pattern registry (verify, reset, welcome) |
| **queues** | Base queue abstraction over BullMQ | DLQ per queue, exponential backoff, metrics |
| **cache** | Redis operations and connection pooling | TTL-aware service, health checks |
| **security** | Password hashing and token generation | Argon2, JWT utilities |
| **socket** | Socket connection registry and room helpers | Per-user room management |
| **core-agents** | AI provider registry (Google Gemini) | Extensible provider pattern |
| **admin** | Admin operations on users, posts, comments | Role-guarded controllers |
| **maintenance** | Scheduled cleanup and metrics sync jobs | 8 cron jobs (orphans, sessions, snapshots) |
| **user-role-periods** | Role history audit trail | Insert-only append for period tracking |

---

## Authentication Flow

```
POST /auth/register     → create user, send verification email (queued)
POST /auth/login        → validate credentials, issue access + refresh JWT pair
POST /auth/refresh      → rotate refresh token (hash stored, raw never persisted)
GET  /auth/google       → OAuth redirect to Google
GET  /auth/google/cb    → exchange code, upsert user, issue token pair
POST /auth/logout       → revoke session by device ID
```

Sessions are **device-scoped**: each device gets its own session row with a hashed refresh token, device fingerprint, and last-seen IP.

---

## Async Processing

Every operation that does not need to block the HTTP response is offloaded to a BullMQ queue:

| Queue | Purpose |
|---|---|
| `email` | Transactional emails (verify, reset, welcome) |
| `post-moderation` | AI comment and post moderation via Gemini |
| `metrics-snapshot` | Periodic counter sync to Prometheus gauges |

Each queue has a paired **DLQ** (`<queue>.dlq`). Terminally failed jobs are moved there after `N` retries for forensic inspection. DLQ growth triggers a Prometheus alert.

---

## Observability

**Metrics** (Prometheus scrape at `/metrics`):
- HTTP request counters, error rates, and latency histograms
- Queue depth, DLQ size, oldest waiting job age
- Business KPIs: active users, post counts by status, chats created, payments

**Logs** (Winston → Loki via Promtail):
- Structured JSON with `requestId`, `userId`, `level`, `service`, `timestamp`
- Absolute file paths masked before emit to avoid host leakage

**Grafana dashboards** (6 total): Overview, Service Health, API Health, Business Core, Infrastructure, Log Analytics

---

## Security Highlights

- Passwords hashed with **Argon2id**
- Refresh tokens stored as **bcrypt hashes** — raw tokens never persisted
- **Helmet** sets security headers on every response
- **CORS** restricted to configured origin
- **Rate limiting** via custom Redis-backed throttler (per-route limits)
- **Idempotency interceptor** prevents duplicate payment and mutating requests
- OAuth **state parameter** validated to prevent CSRF
- **Ownership guard** generically verifies resource ownership without per-route boilerplate
- Global **exception filter** ensures internal details are never leaked in error responses

---

## Testing

| Type | Tool | Scope |
|---|---|---|
| Unit | Jest 30 + ts-jest | 18 services, full mock injection |
| E2E | Jest + Supertest + Testcontainers | Real PostgreSQL + Redis spun up per run |

---

## Documentation

| Document | Purpose |
|---|---|
| [ENDPOINTS.md](ENDPOINTS.md) | Complete reference of all 75 API endpoints with auth, methods, and parameters |
| [API_SWAGGER.md](API_SWAGGER.md) | API usage patterns, authentication flow, file uploads, OAuth, error responses |
| [CHAT.md](CHAT.md) | Chat system architecture, database schema, REST and WebSocket API |
| [ARCHITECTURE.md](ARCHITECTURE.md) | High-level system design and runtime flow |
| [DECISIONS.md](DECISIONS.md) | Technical choices and trade-offs |
| [GETTING_STARTED.md](GETTING_STARTED.md) | Quick onboarding (10 minutes) |
| [TESTING_SHORT.md](TESTING_SHORT.md) | Running tests and quality checks |
| [trust-posts-postman-collection.json](trust-posts-postman-collection.json) | Postman collection with example requests for all endpoints |

**Live API Docs:**
- Swagger UI: `http://localhost:3001/docs`
- OpenAPI JSON: `http://localhost:3001/api-json`
- Health Check: `http://localhost:3001/health`
- Prometheus Metrics: `http://localhost:3001/metrics`

E2E tests cover: auth flows, session management, posts lifecycle, comments, payments, admin operations.

Run:
```bash
npm run test          # unit tests
npm run test:e2e      # e2e tests (requires Docker for Testcontainers)
npm run test:cov      # unit coverage report
```

---

## CI/CD Pipeline

| Trigger | Steps |
|---|---|
| PR → non-main | Lint + format + Docker build validation |
| PR → main | Lint + format + unit tests + E2E tests + Docker build |
| Merge → main | Docker image build + push to DockerHub |
| Commit with `#major` / `#minor` / `#patch` | Automatic version bump + tag |

---

## Running Locally

```bash
cp .env.example .env
make dev-up          # start Postgres + Redis in Docker
npm run mgr:dev      # apply Prisma migrations
npm run seed:full    # seed demo data
npm run dev          # start app with hot reload (localhost:3001)
```

Swagger UI: `http://localhost:3001/docs`  
Metrics: `http://localhost:3001/metrics`

Optional monitoring stack:
```bash
make monitor-up      # Grafana :3000, Prometheus :9090, Loki :3100
```
