# Trust-Post

A production-style social platform backend built with **NestJS 11** and **TypeScript 5**.  
Features JWT auth with Google OAuth, real-time chat (Socket.io), BullMQ queues with DLQ,
WayForPay payments, AI comment moderation (Gemini), and a full observability stack
(Prometheus + Grafana + Loki).

> API docs available at `http://localhost:3001/docs` once the app is running.  
> For a full module breakdown see [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md).  
> For complete API endpoint reference see [docs/ENDPOINTS.md](docs/ENDPOINTS.md).  
> For API usage patterns see [docs/API_SWAGGER.md](docs/API_SWAGGER.md).

---

## Stack

| Category | Technology |
|---|---|
| Framework | NestJS 11, TypeScript 5 (strict) |
| Database | PostgreSQL 15 + Prisma 6 |
| Cache / Queues | Redis 7 + BullMQ 5 |
| Real-time | Socket.io 4 |
| Auth | JWT, Argon2, Google OAuth |
| Storage | Cloudinary |
| Email | Resend |
| Payments | WayForPay |
| Observability | Prometheus + Grafana + Loki + Winston |
| Testing | Jest 30 + Supertest + Testcontainers |
| CI/CD | GitHub Actions + Docker |

---

## Quick Start (Docker — recommended)

> Requires: Docker, `make`, a filled-in `.env` file.

```bash
cp .env.example .env
# Edit .env: set JWT secrets, DB password, Redis password, Cloudinary keys, etc.
make prod
```

This pulls the latest image from DockerHub and starts the app, PostgreSQL, Redis,
and the full monitoring stack in one command.

Redis auth behavior:
- `production` mode: Redis password is required.
- `development` mode: Redis password is optional.

After startup, apply migrations and seed data inside the app container:

```bash
make prod-migrate
make prod-seed
# or all-in-one bootstrap:
make prod-bootstrap
```

For the frontend+backend deployment stack from `deploy/full-stack` use:

```bash
make full-start
make full-migrate
make full-seed
# or all-in-one bootstrap:
make full-bootstrap
```

`make full-start` also enables the monitoring profile, so Grafana, Prometheus, Loki,
Promtail, Alertmanager, and exporters start together with the app stack.

For Google OAuth and image uploads in `full-start`, replace the placeholder values in `.env`
for `GOOGLE_OAUTH_*` and `CLOUDINARY_*`. The full-stack compose uses
`http://localhost/api/v1/auth/google/callback` by default as the Google callback URL.

```bash
make prod-down   # stop all containers
```

### Local Prod-Local (before Docker Hub push)

Use this flow to validate a local production-like image before publishing:

```bash
make prod-local
make prod-local-migrate
make prod-local-seed
# or all in one command:
make prod-local-bootstrap
```

Stop local production-like stack:

```bash
make prod-local-down
```

**Service URLs after startup:**

| Service | URL |
|---|---|
| API | http://localhost:3001/api/v1 |
| Swagger UI | http://localhost:3001/docs |
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| Alertmanager | http://localhost:9093 |
| Loki | http://localhost:3100 |

---

## Local Development (app on host)

> Requires: Node 20, Docker (for Postgres + Redis), `make`.

```bash
# 1. Install dependencies
npm ci

# 2. Set up environment files
cp .env.example .env
cp .env.example .env.test
# In .env.test: set NODE_ENV=test and replace external service keys with test values

# 3. Start Postgres + Redis in Docker
make dev-up

# 4. Apply database migrations
npm run mgr:dev

# 5. Seed demo data (optional)
npm run seed:full

# 6. Start the app with hot reload
npm run dev
```

App runs at `http://localhost:3001`.

**Logs** are written to the console. When `LOGGER_FILE_ENABLED=true` they are also saved to:

```
logs/normal/app.log
logs/error/error.log
logs/error/exceptions.log
```

---

## Testing

```bash
npm run test        # unit tests
npm run test:e2e    # E2E tests — spins up real Postgres + Redis via Testcontainers
npm run test:cov    # unit test coverage report
```

E2E tests require Docker (Testcontainers pulls images automatically on first run).

---

## Code Quality

Run before every push:

```bash
npm run lint:check
npm run format:check
npm run test
npm run build
```

---

## CI/CD

| Trigger | What runs |
|---|---|
| PR → any non-main branch | Lint + format + Docker build validation |
| PR → main | Lint + format + unit tests + E2E tests + Docker build |
| Merge → main | Docker image build and push to DockerHub |
| Commit with `#major` / `#minor` / `#patch` | Automatic version bump and Git tag |

Workflow files: `.github/workflows/`

---

## Project Structure

```
src/
  app/              # Bootstrap and global settings (CORS, Swagger, versioning)
  common/           # Guards, decorators, validators, shared utils
  configs/          # Typed env config with Joi validation
  infrastructure/   # Exception filters, interceptors, health checks, metrics
  modules/          # Feature modules: auth, posts, chat, payments, queues, ...
  shared/           # Logger, error classes, execution context
prisma/             # Prisma schema and migration history
monitoring/         # Prometheus, Grafana, Loki, Alertmanager configs
unit-tests/         # Unit test suites
test/               # E2E test setup (Testcontainers, helpers)
docs/               # Architecture, decisions, API guide, project overview
```

---

## Documentation

| File | Content |
|---|---|
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | Module table, auth flow, async processing, security |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | High-level components and runtime flow |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Technology choices with trade-offs |
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Step-by-step onboarding guide |
| [docs/API_SWAGGER.md](docs/API_SWAGGER.md) | How to use Swagger UI and authenticate |
| [docs/TESTING_SHORT.md](docs/TESTING_SHORT.md) | Test setup notes and commands |

## Steps for quick start
1. Copy environment file:
   cp .env.example .env  
   Then set your credentials by following the instructions in `.env.example` (do not use shared credentials).
2. Start full stack:
   make full-start
3. Run database migrations:
   make full-migrate
4. Seed demo data if needed:
   make full-seed
5. Open browser:
   http://localhost