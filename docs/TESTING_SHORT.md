# Testing (Short)

## Main commands

```bash
npm run test           # unit tests
npm run test:e2e       # e2e tests
npm run test:cov       # coverage
```

## Quality checks before push

```bash
npm run lint:check
npm run format:check
npm run test
npm run build
```

## Notes

- E2E uses `test/jest-e2e.json` and `.env.test`.
- E2E tests spin up real PostgreSQL and Redis automatically via **Testcontainers** — no manual `docker-compose` needed.
- Route constants for e2e are centralized in `test/e2e/constants/routes.ts`.
