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

## URLs

- Frontend: `http://localhost`
- API: `http://localhost/api/v1`
- Swagger: `http://localhost/docs`