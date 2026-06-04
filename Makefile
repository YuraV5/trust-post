ENV_FILE ?= .env
POSTS ?= 25
DOCKER_COMPOSE := docker compose --env-file $(ENV_FILE)
DEV_COMPOSE := $(DOCKER_COMPOSE) -f docker-compose.local.yml
PROD_COMPOSE := $(DOCKER_COMPOSE) -f docker-compose.yml --profile monitoring
PROD_LOCAL_COMPOSE := $(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.prod-local.yml --profile monitoring

# Ensure environment file exists.
ensure-env:
	@node -e "const fs=require('fs');const env='$(ENV_FILE)';if(!fs.existsSync(env)){console.log('No '+env+' found - copying .env.example');fs.copyFileSync('.env.example',env);}"

# One-command production-like local startup: pull latest app image and run full stack.
prod: ensure-env
	$(PROD_COMPOSE) pull app
	$(PROD_COMPOSE) up -d

# Production-like local startup from local image (pre-push smoke test).
prod-local: ensure-env
	$(PROD_LOCAL_COMPOSE) up -d --build

# Backward-compatible alias.
start: prod

# Stop the full containerized stack.
prod-down:
	$(PROD_COMPOSE) down

# Stop the local-image production-like stack.
prod-local-down:
	$(PROD_LOCAL_COMPOSE) down

# Backward-compatible alias.
stop: prod-down

# Start only local infrastructure for development.
dev-up:
	$(DEV_COMPOSE) up -d

# Stop local infrastructure and remove containers.
dev-down:
	$(DEV_COMPOSE) down

# Follow local infrastructure logs.
dev-logs:
	$(DEV_COMPOSE) logs -f db redis

# Run the app locally with hot reload.
app-dev:
	npm run dev

# Follow logs for the full containerized stack.
prod-logs:
	$(PROD_COMPOSE) logs -f app db redis prometheus grafana loki promtail alertmanager

# Follow logs for local-image production-like stack.
prod-local-logs:
	$(PROD_LOCAL_COMPOSE) logs -f app db redis prometheus grafana loki promtail alertmanager

# Apply production-safe Prisma migrations in the app container.
prod-migrate:
	$(PROD_COMPOSE) exec -T app npm run mgr:deploy

# Apply migrations in local-image production-like stack.
prod-local-migrate:
	$(PROD_LOCAL_COMPOSE) exec -T app npm run mgr:deploy

# Seed production-like local data in the app container.
prod-seed:
	$(PROD_COMPOSE) exec -T app npm run seed:full:prod

# Seed local-image production-like stack.
prod-local-seed:
	$(PROD_LOCAL_COMPOSE) exec -T app npm run seed:full:prod

# Full bootstrap for production-like local env: start, migrate, seed.
prod-bootstrap: prod prod-migrate prod-seed

# Full bootstrap for local-image production-like env.
prod-local-bootstrap: prod-local prod-local-migrate prod-local-seed

# Build the Nest application.
build:
	npm run build

# Run ESLint with autofix.
lint:
	npm run lint

# Run unit tests.
test:
	npm run test

# Run end-to-end tests.
test-e2e:
	npm run test:e2e

# Generate Prisma client.
prisma-generate:
	npm run pr:gen

# Run development migrations.
prisma-migrate:
	npm run mgr:dev

# Reset local database and rerun migrations.
prisma-reset:
	npm run db:reset

# Seed only users.
seed-users:
	npm run seed:users

# Seed only staff users (1 admin + 2 moderators).
seed-staff:
	npm run seed:staff

# Seed only posts.
seed-posts:
	npm run seed:posts -- --posts=$(POSTS)

# Seed only comments.
seed-comments:
	npm run seed:comments

# Seed the full demo dataset.
seed-full:
	npm run seed:full -- --posts=$(POSTS)