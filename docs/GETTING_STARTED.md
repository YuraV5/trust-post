# Getting Started (10 Minutes)

This file is a short onboarding guide for a new developer.

## 1. Requirements

- Node.js 20+
- Docker + Docker Compose
- npm

## 2. Install and configure

```bash
npm ci
cp .env.example .env
```

## 3. Start infrastructure

```bash
npm run docker:dev
```

This starts PostgreSQL and Redis for local development.

## 4. Prepare database

```bash
npm run mgr:dev
npm run seed:full
```

## 5. Start backend

```bash
npm run dev
```

## 6. Open key endpoints

- API base: `http://localhost:3001/api/v1`
- Swagger UI: `http://localhost:3001/docs`
- Health: `http://localhost:3001/api/v1/health/readiness`

## 7. Useful stop commands

```bash
npm run docker:dev:down
```

## 8. Prod-local check before Docker Hub push

```bash
npm run docker:prod-local
npm run docker:prod-local:migrate
npm run docker:prod-local:seed
```

Redis behavior by mode:
- `production`: password required
- `development`: password optional

Stop prod-local stack:

```bash
npm run docker:prod-local:down
```
