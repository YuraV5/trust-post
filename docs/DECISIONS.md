# Technical Decisions

## Why NestJS

- Clear module boundaries
- Built-in DI, guards, interceptors
- Good fit for scalable backend teams

## Why Prisma + PostgreSQL

- Type-safe database access
- Fast iteration with migrations
- Strong relational model for social features

## Why Redis + BullMQ

- Reliable background processing
- Decouples API latency from async jobs
- Better resilience under peak traffic

## Why Observability Stack

- Prometheus: service and infrastructure metrics
- Loki: centralized log aggregation
- Grafana: dashboard and alert visibility

## Current Trade-Offs

- Single service codebase (simpler now, less independent scaling)
- Provider-specific payment integration (faster delivery, less portability)
- OAuth providers are config-driven but need production credential rotation policy
