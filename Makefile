ENV_FILE ?= .env
DOCKER_COMPOSE := docker compose --env-file $(ENV_FILE)
LOCAL_COMPOSE := $(DOCKER_COMPOSE) -f docker-compose.local.yml
LOCAL_MONITORING_COMPOSE := $(DOCKER_COMPOSE) -f docker-compose.local.yml -f docker-compose.monitoring.dev.yml

.PHONY: help start stop dev-up dev-down dev-logs app-dev monitor-up monitor-down monitor-logs prod-up prod-down prod-logs build lint test test-e2e seed-users seed-posts seed-comments seed-full prisma-generate prisma-migrate prisma-reset

# Show the main commands.
help:
	@echo "Trust Post command list"
	@echo ""
	@echo "Quick start:"
	@echo "  make start             Start full dev stack in Docker (app + db + redis, with hot reload)"
	@echo "  make stop              Stop the dev Docker stack"
	@echo ""
	@echo "Local development:"
	@echo "  make dev-up            Start local Postgres and Redis"
	@echo "  make dev-down          Stop local Postgres and Redis"
	@echo "  make dev-logs          Show logs for local Postgres and Redis"
	@echo "  make app-dev           Run Nest app locally in watch mode"
	@echo ""
	@echo "Local monitoring for host app:"
	@echo "  make monitor-up        Start Prometheus, Grafana, Loki and exporters for local app"
	@echo "  make monitor-down      Stop local monitoring stack"
	@echo "  make monitor-logs      Show monitoring stack logs"
	@echo ""
	@echo "Full container stack:"
	@echo "  make prod-up           Start app, db, redis and monitoring in Docker"
	@echo "  make prod-down         Stop full Docker stack"
	@echo "  make prod-logs         Show logs for the full Docker stack"
	@echo ""
	@echo "Project utilities:"
	@echo "  make build             Build Nest app"
	@echo "  make lint              Run ESLint"
	@echo "  make test              Run unit tests"
	@echo "  make test-e2e          Run e2e tests"
	@echo "  make prisma-generate   Generate Prisma client"
	@echo "  make prisma-migrate    Run prisma migrate dev"
	@echo "  make prisma-reset      Reset local database"
	@echo "  make seed-users        Seed users"
	@echo "  make seed-posts        Seed posts"
	@echo "  make seed-comments     Seed comments"
	@echo "  make seed-full         Seed full demo data"
	@echo ""
	@echo "Optional: set custom env file, example: make dev-up ENV_FILE=.env.example"

# Pull the latest image from DockerHub and start app + db + redis + monitoring.
start:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "No $(ENV_FILE) found — copying .env.example"; \
		cp .env.example $(ENV_FILE); \
	fi
	$(DOCKER_COMPOSE) --profile monitoring pull app
	$(DOCKER_COMPOSE) --profile monitoring up -d

# Stop the full stack.
stop:
	$(DOCKER_COMPOSE) --profile monitoring down

# Start only local infrastructure for development.
dev-up:
	$(LOCAL_COMPOSE) up -d

# Stop local infrastructure and remove containers.
dev-down:
	$(LOCAL_COMPOSE) down

# Follow local infrastructure logs.
dev-logs:
	$(LOCAL_COMPOSE) logs -f db redis

# Run the app locally with hot reload.
app-dev:
	npm run dev

# Start monitoring containers that scrape the locally running app.
monitor-up:
	$(LOCAL_MONITORING_COMPOSE) up -d

# Stop only the monitoring containers for local development.
monitor-down:
	$(LOCAL_MONITORING_COMPOSE) down

# Follow logs for Prometheus, Grafana, Loki and exporters.
monitor-logs:
	$(LOCAL_MONITORING_COMPOSE) logs -f prometheus grafana loki promtail postgres-exporter redis-exporter node-exporter

# Start the full containerized stack, including the app.
prod-up:
	$(DOCKER_COMPOSE) --profile monitoring up -d

# Stop the full containerized stack.
prod-down:
	$(DOCKER_COMPOSE) down

# Follow logs for the full containerized stack.
prod-logs:
	$(DOCKER_COMPOSE) logs -f app db redis prometheus grafana loki promtail alertmanager

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

# Seed only posts.
seed-posts:
	npm run seed:posts

# Seed only comments.
seed-comments:
	npm run seed:comments

# Seed the full demo dataset.
seed-full:
	npm run seed:full