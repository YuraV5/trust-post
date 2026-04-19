/* eslint-disable */
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export const ENV_SNAPSHOT_FILE = path.join(__dirname, '.testcontainers.env.json');

declare global {
  var __pg_container__: StartedPostgreSqlContainer;

  var __redis_container__: StartedRedisContainer;
}

export default async function globalSetup(): Promise<void> {
  console.log('\n[testcontainers] Starting PostgreSQL and Redis containers...');

  const [postgres, redis] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('trust_post_test')
      .withUsername('test')
      .withPassword('test')
      .start(),
    new RedisContainer('redis:7-alpine').start(),
  ]);

  global.__pg_container__ = postgres;
  global.__redis_container__ = redis;

  const databaseUrl = postgres.getConnectionUri();
  const redisHost = redis.getHost();
  const redisPort = redis.getMappedPort(6379);

  console.log(`[testcontainers] PostgreSQL: ${databaseUrl}`);
  console.log(`[testcontainers] Redis: ${redisHost}:${redisPort}`);

  // Run Prisma migrations against the fresh test database
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DB_USER: 'test',
      DB_PASSWORD: 'test',
      DB_NAME: 'trust_post_test',
    },
    stdio: 'inherit',
  });

  console.log('[testcontainers] Migrations applied.');

  // Persist dynamic values so Jest worker processes can pick them up via setupFiles
  fs.writeFileSync(
    ENV_SNAPSHOT_FILE,
    JSON.stringify({
      DATABASE_URL: databaseUrl,
      DB_USER: 'test',
      DB_PASSWORD: 'test',
      DB_NAME: 'trust_post_test',
      REDIS_HOST: redisHost,
      REDIS_PORT: String(redisPort),
    }),
    'utf-8',
  );
}
