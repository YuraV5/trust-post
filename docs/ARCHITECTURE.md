# Architecture Summary

## Goal

Provide a production-style backend for a social platform with strong modular boundaries,
reliable background processing, and observable runtime behavior.

## High-Level Components

- API Layer (NestJS): REST controllers, DTO validation, auth guards
- Domain Modules: auth, users, posts, comments, chat, payments, admin
- Data Layer: Prisma + PostgreSQL
- Async Layer: BullMQ + Redis
- Realtime Layer: Socket.io gateway for chat
- Storage/CDN Layer: Cloudinary integration
- Observability Layer: Prometheus metrics, Loki logs, Grafana dashboards

## Runtime Flow

1. Client calls API endpoint.
2. Request passes guards, throttling, and validation.
3. Service executes domain logic and persists via Prisma.
4. Optional async jobs are pushed to BullMQ.
5. Metrics and logs are emitted for observability.

## Key Reliability Practices

- Health checks for app dependencies
- Containerized local/prod-like environments
- Structured logging
- Monitoring stack with alert rules
- CI checks for lint, format, unit tests, and build
