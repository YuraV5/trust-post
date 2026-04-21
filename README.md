# Trust-Post

Trust-Post is a modular social platform backend built with NestJS and Prisma.
It demonstrates production-focused backend engineering: authentication, real-time chat,
background jobs, payments, observability, and Docker-based environments.

## Stack

- NestJS 11, TypeScript 5
- PostgreSQL + Prisma
- Redis + BullMQ
- Socket.io (real-time chat)
- Swagger/OpenAPI
- Prometheus + Grafana + Loki
- Docker + GitHub Actions

## Core Features

- JWT auth and OAuth providers
- Posts, comments, likes, and file upload flow
- Real-time chat over WebSockets
- Queue-based email and background jobs
- Payment module (WayForPay integration)
- Role-based admin and moderation flows
- Rate limiting and validation guards

## Quick Start (Local)

## Quick Start

```bash
cp .env.example .env
# Fill in your values: DOCKERHUB_USERNAME, JWT secrets, etc.
make start
```

Pulls the latest image from DockerHub and starts app + db + redis + full monitoring stack.

```bash
make stop   # stop everything
```

| Service    | URL                         |
|------------|-----------------------------|
| App        | http://localhost:3001        |
| Docs       | http://localhost:3001/docs   |
| Grafana    | http://localhost:3000        |
| Prometheus | http://localhost:9090        |
| Alertmanager | http://localhost:9093      |
| Loki       | http://localhost:3100        |

## Development (app on host)

```bash
npm ci
cp .env.example .env
cp .env.example .env.test # NODE_ENV=test need to be replaced with test values ​​such as fba keys base url
make dev-up       # start Postgres + Redis
npm run mgr:dev   # run migrations
npm run seed:full # seed demo data
npm run dev       # start app with hot reload
```

Local monitoring (scrapes the host app):

```bash
make monitor-up
make monitor-down
```

Application logs are written to the console and, when `LOGGER_FILE_ENABLED=true`, also to:

- `logs/normal/app.log`
- `logs/error/error.log`
- `logs/error/exceptions.log`

Queue observability baseline includes:

- DLQ per queue (`<queue>.dlq`) for terminally failed jobs
- Queue health metrics (`queue_jobs_current`, `queue_oldest_waiting_job_age_seconds`, `queue_failed_retried_jobs_current`)
- DLQ metrics and alerts (`queue_dlq_jobs_current`, `queue_dlq_total`)
- Prometheus alerts for queue lag, backlog SLA, repeated failures, and DLQ growth

## Quality Checks

Run these checks before pushing:

```bash
npm run lint:check
npm run format:check
npm run test
npm run build
```

## CI

Pull request checks depend on the target branch:

- PR to non-main: quick checks (lint + format) and build validation (app build + Docker build without push)
- PR to main: full checks (lint + format + unit + e2e) and Docker build validation

After merge to main, a separate workflow bumps the version tag and pushes Docker images.

Workflow files are under .github/workflows.

## Project Structure

```text
src/
  app/              # app bootstrapping and global setup
  common/           # guards, decorators, shared helpers
  configs/          # typed config modules
  infrastructure/   # adapters and integrations
  modules/          # feature modules (auth, posts, chat, payments, etc.)
  shared/           # shared services and logger
prisma/             # schema and migrations
monitoring/         # prometheus, grafana, loki, alertmanager config
unit-tests/         # unit test suites
test/               # integration and container test setup
```

## Portfolio Notes

This project is focused on backend architecture and operational readiness.
See short engineering notes:

- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/GETTING_STARTED.md
- docs/API_SWAGGER.md
- docs/TESTING_SHORT.md
- docs/PORTFOLIO_CHECKLIST.md

## Version bump is controlled by keywords in commit messages or PR title:
  #major  → v1.0.0 → v2.0.0
  #minor  → v1.0.0 → v1.1.0
  #patch  → v1.0.0 → v1.0.1  (default if no keyword found)
