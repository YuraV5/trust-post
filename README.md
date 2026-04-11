## 🎯 Project Overview

**Trust-Post** is a production-ready Node.js/NestJS backend for a modern social network platform. It provides:

- 🔐 **User Authentication** — JWT + OAuth (Google, GitHub, etc.)
- 💬 **Real-time Messaging** — WebSockets with Socket.io
- 📝 **Post Management** — Create, edit, delete, like posts
- 👥 **User System** — Profiles, roles, permissions
- 🛡️ **Moderation Tools** — Staff dashboard, post review workflow
- 💳 **Payment Integration** — WayForPay gateway support
- 📊 **Caching & Queue System** — Redis + BullMQ
- 🐳 **Docker Ready** — Development and production configs
- 📚 **Auto-generated API Docs** — Swagger/OpenAPI


## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (`node --version`)
- **npm** 9+ (`npm --version`)
- **Docker & Docker Compose** (for database)
- **PostgreSQL** 14+ (or use Docker)
- **Redis** 7+ (or use Docker)

### Installation

#### 1. Clone & Install Dependencies
```bash
git clone <repo>
cd trust-post
npm install
```

#### 2. Environment Setup
```bash
# Copy example config
cp .env.example .env.local

# Edit environment variables
# Required:
# - DATABASE_URL (PostgreSQL)
# - REDIS_URL (Redis)
# - JWT_SECRET (any random string)
# - FRONTEND_URL (http://localhost:3000)
```

#### 3. Start Services (Docker)
```bash
# Start PostgreSQL & Redis
npm run docker:dev

# Or use docker-compose directly
docker compose --env-file .env.local up -d
```

#### 4. Database Setup
```bash
# Run migrations
npm run mgr:dev

# Seed sample data (optional)
npm run seed:full
```

#### 5. Start Application
```bash
# Development mode (watch)
npm run dev

# Production mode
npm run prod

# Debug mode
npm run debug
```

Server will be running at: **http://localhost:3001**

Swagger docs: **http://localhost:3001/docs** (if `SWAGGER_ENABLED=true`)

## 📊 Monitoring Stack

The monitoring stack is **optional** and can be toggled via Docker Compose **profiles**. 

### Dev Mode (Without Monitoring) — Fast Startup ⚡

```bash
# Start only app + postgres + redis (fastest)
npm run docker:dev
# or
docker compose --env-file .env.local up -d
```

### With Monitoring Stack

```bash
# Start app + postgres + redis + prometheus + grafana + loki + exporters
docker compose --profile monitoring --env-file .env.local up -d
```

**Monitoring URLs:**

- Prometheus: http://localhost:9090 — Metrics database
- Alertmanager: http://localhost:9093 — Alert routing
- Grafana: http://localhost:3000 — Dashboards (admin/admin)
- Loki: http://localhost:3100 — Log aggregation

**Services in "monitoring" profile:**
- `postgres-exporter` — DB metrics
- `redis-exporter` — Redis metrics  
- `node-exporter` — Host/OS metrics
- `prometheus` — Metrics scraper
- `alertmanager` — Alert manager
- `loki` — Log aggregation
- `promtail` — Log collector
- `grafana` — Dashboard UI

**Configuration files:**
- `monitoring/prometheus/prometheus.yml` — Scrape jobs + storage
- `monitoring/prometheus/rules.yml` — Alert rules (5xx rate, service down)
- `monitoring/alertmanager/alertmanager.yml` — Alert routing
- `monitoring/loki/loki-config.yml` — Log storage config
- `monitoring/promtail/promtail-config.yml` — Log collection jobs
- Grafana provisioning + dashboard: `monitoring/grafana/`

Note:

- Slack/Telegram notifications are intentionally left as placeholders for the next phase.
- Receiver names (`slack`, `telegram`) are already prepared in Alertmanager config, so integrations can be added later without compose changes.

Manual test alert flow (without Slack/Telegram integration):

1. Uncomment `TrustPostManualTestAlert` rule in `monitoring/prometheus/rules.yml`.
2. Reload Prometheus config:

```bash
curl -X POST http://localhost:9090/-/reload
```

3. Verify alert in Alertmanager UI (`http://localhost:9093`) and in Grafana alert views.

## 🏗️ Architecture

### Modules

The application is organized into feature modules:

```
src/modules/
├── auth/              # Authentication & sessions
├── users/             # User profiles & management
├── posts/             # Posts, comments, files
├── chat/              # Real-time chat (WebSocket)
├── message/           # Chat messages
├── admin/             # Admin operations
├── payments/          # Payment processing
├── files/             # File uploads & storage
├── emails/            # Email sending queue
├── cache/             # Redis health check
└── security/          # Security utilities
```

### Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) 11
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5.7
- **Database**: [PostgreSQL](https://www.postgresql.org/) 16 + [Prisma](https://www.prisma.io/) ORM
- **Caching**: [Redis](https://redis.io/) 7 + [ioredis](https://github.com/luin/ioredis)
- **Job Queue**: [BullMQ](https://docs.bullmq.io/)
- **Real-time**: [Socket.io](https://socket.io/)
- **Authentication**: JWT + [argon2](https://en.wikipedia.org/wiki/Argon2) for password hashing
- **File Storage**: [Cloudinary](https://cloudinary.com/) CDN
- **Validation**: [class-validator](https://github.com/typestack/class-validator)
- **Documentation**: [Swagger/OpenAPI](https://swagger.io/)


## 📦 Build & Deploy

### Production Build
```bash
# Build TypeScript
npm run build

# Check output
ls -la dist/

# Run production server
npm run prod
```

### Docker Production

```bash
# Build image
docker build -t trust-post:latest .

# Run with docker-compose
docker compose -f docker-compose.yml up

# Clean up
docker compose down -v

## 🛠️ Development

### Code Structure
```
src/
├── app/               # Application setup (Swagger, guards, etc.)
├── common/            # Shared decorators, guards, utilities
├── modules/           # Feature modules
├── shared/            # Global services (logger, config)
└── main.ts            # Entry point

## 🔒 Security Best Practices

1. **Environment Variables** — Never commit `.env` files
2. **Password Hashing** — Using Argon2 (industry standard)
3. **CORS** — Configured for frontend domain only
4. **Helmet** — Express security headers enabled
5. **Rate Limiting** — Per-route throttling active
6. **HTTPS** — Required in production
7. **Database** — Prepared statements via Prisma
8. **Input Validation** — class-validator on all DTOs
