# Trust Post Tools

Tools and utilities for managing the Trust Post application.

## Seeding

Seeding is split into independent commands, so you can run only the data group you need.

### 1) Users and Roles

Create users and role history:

```bash
npm run seed:users
```

This script creates:
- 2 admins
- 5 moderators
- 10 users
- role period records in `user_role_periods`

### 2) Posts and Moderation Reviews

Create posts for users and moderation reviews by moderators:

```bash
npm run seed:posts
```

This script creates:
- 2-3 posts for each user
- posts with mixed statuses (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`)
- 1-3 reviews per moderated post in `post_reviews`

### 3) Comments and Likes

Create comments and likes for approved posts:

```bash
npm run seed:comments
```

This script creates:
- comments for approved posts
- likes for comments
- likes for posts
- recalculates counters (`totalComments`, `totalLikes`)

### Full Seed

Run all steps in order:

```bash
npm run seed:full
```

### Prod-local Seed (inside container)

For `prod-local` flow, run seed inside the app container runtime:

```bash
make prod-local-seed ENV_FILE=.env.prod.local
# or
npm run docker:prod-local:seed
```

The seed launcher now resolves the right entry automatically:
- on host it runs the TypeScript source through `ts-node`
- in runtime containers it falls back to the compiled `dist/tools/seeds.js`

For the full frontend+backend stack from `deploy/full-stack`, use:

```bash
make full-seed
# or
make full-bootstrap
```

### Usage

1. Run migrations first (if needed):
   ```bash
   npm run mgr:dev
   ```

2. Seed data by step (or run full):
   ```bash
   npm run seed:users
   npm run seed:posts
   npm run seed:comments
   # or
   npm run seed:full
   ```

3. Or reset the entire database with fresh migrations:
   ```bash
   npm run db:reset
   ```
   Note: This will NOT automatically seed data. Run `npm run seed:full` afterwards.

## Notes

- Seeding is **NOT** automatic. Run commands manually.
- Good for local development and testing.
- Always change default passwords in production!
