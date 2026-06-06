# Full Stack Compose

This folder runs the full deployment stack from the backend repository:

- frontend image `${DOCKERHUB_USERNAME}/trust-front:latest`
- backend image `${DOCKERHUB_USERNAME}/trust-post:latest`
- Postgres
- Redis
- optional monitoring profile

## Commands

Run these from the `trust-post` root:

```bash
make full-start
make full-migrate
make full-seed
make full-down
```

By default the stack is exposed on `http://localhost` and the frontend is built with `/api/v1`.
If you need another public host, set these in `trust-post/.env` before running:

```bash
FULL_STACK_PUBLIC_URL=https://your-domain.example
FULL_STACK_SERVICE_URL=https://your-domain.example/api/v1
```

Monitoring profile can be started manually:

```bash
docker compose --env-file .env -f deploy/full-stack/docker-compose.yml --profile monitoring up -d --build
```

The compose file does not build images locally. `make full-start` pulls the latest frontend and backend images from Docker Hub and then starts the stack.
The `make full-start` target also enables the `monitoring` profile, so Grafana, Prometheus,
Loki, Promtail, Alertmanager, postgres-exporter, redis-exporter, and node-exporter are included.

Before `make full-start`, set real `CLOUDINARY_*` and `GOOGLE_OAUTH_*` values in `trust-post/.env`.
The default callback URL for this stack is `http://localhost/api/v1/auth/google/callback`, so the same URL
must be registered in Google Cloud Console unless you override it with `FULL_STACK_GOOGLE_OAUTH_CALLBACK_URL`.

## URLs

- Frontend: `http://localhost`
- API: `http://localhost/api/v1`
- Swagger: `http://localhost/docs`

## Steps
1 Copy environment file: cp .env.example .env
2 Start full stack: make full-start
3 Run database migrations: make full-migrate
4 Seed demo data if needed: make full-seed
5 Open browser: http://localhost 
