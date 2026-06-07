ENV_FILE ?= .env
POSTS ?= 25
DOCKER_COMPOSE := docker compose --env-file $(ENV_FILE)
DEV_COMPOSE := $(DOCKER_COMPOSE) -f docker-compose.local.yml
PROD_COMPOSE := $(DOCKER_COMPOSE) -f docker-compose.yml --profile monitoring
PROD_LOCAL_COMPOSE := $(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.prod-local.yml --profile monitoring
FULL_STACK_COMPOSE := $(DOCKER_COMPOSE) -f deploy/full-stack/docker-compose.yml --profile monitoring
CONTAINER_SEED_CMD := node dist/tools/seeds.js full -- --posts=100

# Ensure environment file exists.
ensure-env:
	@node -e "const fs=require('fs');const env='$(ENV_FILE)';if(!fs.existsSync(env)){console.log('No '+env+' found - copying .env.example');fs.copyFileSync('.env.example',env);}"

# Ensure third-party integrations are configured for full-stack flows.
check-full-stack-integrations:
	@node -e "const fs=require('fs');const envPath='$(ENV_FILE)';const raw=fs.readFileSync(envPath,'utf8');const map={};for(const line of raw.split(/\r?\n/)){if(!line||line.trim().startsWith('#')) continue; const idx=line.indexOf('='); if(idx===-1) continue; map[line.slice(0,idx).trim()]=line.slice(idx+1).trim();} const invalid=[['CLOUDINARY_CLOUD_NAME',['','your_cloud_name']],['CLOUDINARY_API_KEY',['','xxxxxxxxx']],['CLOUDINARY_API_SECRET',['','xxxxxxxxx']],['GOOGLE_OAUTH_CLIENT_ID',['','client_id.apps.googleusercontent.com']],['GOOGLE_OAUTH_CLIENT_SECRET',['','your_google_client_secret']]].filter(([key,bad])=>bad.includes(map[key]||'')); if(invalid.length){console.error('Full-stack integrations are not configured in '+envPath+'. Update these variables before running full-start:'); for(const [key] of invalid) console.error(' - '+key); process.exit(1);}"

# One-command production-like local startup: pull latest app image and run full stack.
prod: ensure-env
	$(PROD_COMPOSE) pull app
	$(PROD_COMPOSE) up -d
# Production-like local startup from local image (pre-push smoke test).
prod-local: ensure-env
	$(PROD_LOCAL_COMPOSE) up -d --build
# Stop the full containerized stack.
prod-down:
	$(PROD_COMPOSE) down
# Stop the local-image production-like stack.
prod-local-down:
	$(PROD_LOCAL_COMPOSE) down

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
	$(PROD_COMPOSE) exec -T app $(CONTAINER_SEED_CMD)
# Seed local-image production-like stack.
prod-local-seed:
	$(PROD_LOCAL_COMPOSE) exec -T app $(CONTAINER_SEED_CMD)
# Full bootstrap for production-like local env: start, migrate, seed.
prod-bootstrap: prod prod-migrate prod-seed
# Full bootstrap for local-image production-like env.
prod-local-bootstrap: prod-local prod-local-migrate prod-local-seed

## Full stack with frontend+backend in containers (for production-like local testing and demos).
# Start the full stack with frontend, backend, db, and redis in containers.
full-start: ensure-env check-full-stack-integrations
	$(FULL_STACK_COMPOSE) pull frontend app
	$(FULL_STACK_COMPOSE) up -d

# Stop the full frontend+backend deployment stack.
full-down:
	$(FULL_STACK_COMPOSE) down

# Apply production-safe Prisma migrations in the full deployment stack.
full-migrate:
	$(FULL_STACK_COMPOSE) exec -T app npm run mgr:deploy

full-db-reset:
	$(FULL_STACK_COMPOSE) exec -T app npm run db:reset

# Seed demo data in the full deployment stack app container.
full-seed:
	$(FULL_STACK_COMPOSE) exec -T app $(CONTAINER_SEED_CMD)

# Full bootstrap for the frontend+backend deployment stack.
full-bootstrap: full-start full-migrate full-seed

## Full stack with frontend+backend in containers (for production-like local testing and demos).
# Start the full stack with frontend, backend, db, and redis in containers.
full-start: ensure-env check-full-stack-integrations
	$(FULL_STACK_COMPOSE) pull frontend app
	$(FULL_STACK_COMPOSE) up -d

# Stop the full frontend+backend deployment stack.
full-down:
	$(FULL_STACK_COMPOSE) down

# Apply production-safe Prisma migrations in the full deployment stack.
full-migrate:
	$(FULL_STACK_COMPOSE) exec -T app npm run mgr:deploy

full-db-reset:
	$(FULL_STACK_COMPOSE) exec -T app npm run db:reset

# Seed demo data in the full deployment stack app container.
full-seed:
	$(FULL_STACK_COMPOSE) exec -T app $(CONTAINER_SEED_CMD)

# Full bootstrap for the frontend+backend deployment stack.
full-bootstrap: full-start full-migrate full-seed

# Start the full stack with frontend, backend, db, and redis in containers.
full-start: ensure-env
	$(FULL_STACK_COMPOSE) pull frontend app
	$(FULL_STACK_COMPOSE) up -d

# Stop the full frontend+backend deployment stack.
full-down:
	$(FULL_STACK_COMPOSE) down

# Apply production-safe Prisma migrations in the full deployment stack.
full-migrate:
	$(FULL_STACK_COMPOSE) exec -T app npm run mgr:deploy

# Build the Nest application.
build:
	npm run build

# Run unit tests.
test:
	npm run test
# Run end-to-end tests.
e2e:
	npm run test:e2e

# Apply Prisma migrations in the app container.
migrate:
	npm run mgr:deploy

# Seed only users.
seed-full:
	npm run seed:full -- --posts=$(POSTS)
seed-users:
	npm run seed:users
seed-staff:
	npm run seed:staff
seed-posts:
	npm run seed:posts -- --posts=$(POSTS)
seed-comments:
	npm run seed:comments
