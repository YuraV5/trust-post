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

### 1. Install

```bash
npm ci
cp .env.example .env.local
```

### 2. Start infra

```bash
npm run docker:dev
```

### 3. Run migrations and seed

```bash
npm run mgr:dev
npm run seed:full
```

### 4. Start app

```bash
npm run dev
```

App: http://localhost:3001
Docs: http://localhost:3001/docs

## Monitoring

Local monitoring for app running on host:

```bash
npm run docker:monitor:dev
```

Main endpoints:

- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Grafana: http://localhost:3000
- Loki: http://localhost:3100

## Quality Checks

Run these checks before pushing:

```bash
npm run lint:check
npm run format:check
npm run test
npm run build
```

## CI

Pull request checks include:

- lint check
- format check
- unit tests
- build
- docker image build validation

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
- docs/PORTFOLIO_CHECKLIST.md
