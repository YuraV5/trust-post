# Trust Post Tools

Tools and utilities for managing the Trust Post application.

## Seeding

### Manual Admin User Seeding

Create admin and moderator users manually:

```bash
npm run seed:admin
```

This script creates:
- **Admin**: `admin@mail.com` (password: `Qwert!123`)
- **Moderator**: `moderator@mail.com` (password: `Qwert!123`)

The script checks if the admin user already exists and skips creation if it does.

### Usage

1. Run migrations first (if needed):
   ```bash
   npm run mgr:dev
   ```

2. Then seed the admin and moderator users:
   ```bash
   npm run seed:admin
   ```

3. Or reset the entire database with fresh migrations:
   ```bash
   npm run db:reset
   ```
   Note: This will NOT automatically seed users. Run `npm run seed:admin` afterwards.

## Notes

- The seed script is **NOT** automatic. You must run it manually.
- Good for local development and testing.
- Always change default passwords in production!
