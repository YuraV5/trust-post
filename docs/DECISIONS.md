# Technical Decisions

## Why NestJS

- Clear module boundaries with built-in DI, guards, and interceptors
- Decorator-based structure maps well to layered architecture (controller → service → repo)
- Good fit for teams; enforces consistent patterns across modules

## Why Prisma + PostgreSQL

- Type-safe DB access with generated client (no raw SQL drift)
- Migration history tracked in version control
- Strong relational model for social features (users, posts, comments, likes, sessions)

## Why Redis + BullMQ

- Reliable background processing with guaranteed delivery and retry
- Decouples API response latency from async work (email, moderation, metrics)
- Redis also serves as cache store and Socket.io adapter — single infra dependency for three concerns

## Why Argon2id (not bcrypt)

- Argon2id is the current OWASP-recommended algorithm for password hashing
- Memory-hard by design — resists GPU brute-force attacks better than bcrypt
- Same interface via `argon2` npm package; no migration cost

## Why Device-Scoped Sessions

- Each device gets its own session row with a hashed refresh token and device fingerprint
- Users can see active sessions per device and revoke individual ones (not all-or-nothing)
- Reduces blast radius of a stolen refresh token to a single device

## Why Cloudinary

- Managed CDN + image transformation pipeline without self-hosting storage
- Handles upload, resizing, and CDN delivery in one integration
- Signed upload URLs prevent unauthenticated direct uploads

## Why Resend (not Nodemailer)

- Managed email delivery with high deliverability out of the box
- Clean SDK, no SMTP server to maintain
- Emails dispatched via BullMQ queue — delivery is decoupled from the HTTP request

## Why Google Gemini for Moderation

- Available via a simple REST SDK with no infrastructure to manage
- `core-agents` module wraps it behind a provider registry — swap or add providers without touching consumers
- Enables AI-assisted pre-screening before human moderator review

## Why Observability Stack (Prometheus + Grafana + Loki)

- Prometheus: scrape-based metrics with alerting rules; pairs naturally with Docker Compose
- Loki: log aggregation without the cost of Elasticsearch; queries via same Grafana instance
- Grafana: single UI for metrics, logs, and alerts — reduces context switching during incidents

## Current Trade-Offs

- **Single service codebase**: simpler to develop and deploy now; would need splitting for independent scaling of hot modules (e.g., chat, payments)
- **Provider-specific payments**: WayForPay integration is faster to deliver but less portable; an abstract payment provider interface is a natural next step
- **Single PostgreSQL instance**: no read replica; fine for current load, bottleneck at scale
- **OAuth credential rotation**: no automated rotation; requires manual env var update and redeploy
