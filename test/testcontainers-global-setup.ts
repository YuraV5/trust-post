import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';

let postgresContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test';

  // Create PostgreSQL container
  postgresContainer = await new PostgreSqlContainer('postgres:15')
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .start();

  // Create Redis container
  redisContainer = await new RedisContainer('redis:7-alpine').start();

  // Get connection string
  const databaseUrl = postgresContainer.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;
  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = String(redisContainer.getPort());

  // Apply Prisma migrations
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'inherit' });

  // Save containers for teardown
  (global as any).__TESTCONTAINERS__ = {
    postgres: postgresContainer,
    redis: redisContainer,
  };
}
