import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer;

export default async function globalSetup(): Promise<void> {
  // Create PostgreSQL container
  container = await new PostgreSqlContainer('postgres:15')
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .start();

  // Get connection string
  const databaseUrl = container.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;

  // Apply Prisma migrations
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'inherit' });

  // Save container for teardown
  (global as any).__TESTCONTAINER__ = container;
}
