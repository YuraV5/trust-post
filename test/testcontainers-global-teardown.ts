import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedRedisContainer } from '@testcontainers/redis';

export default async function globalTeardown(): Promise<void> {
  const containers = (global as any).__TESTCONTAINERS__ as {
    postgres?: StartedPostgreSqlContainer;
    redis?: StartedRedisContainer;
  };

  if (containers?.postgres) {
    await containers.postgres.stop();
    console.log('PostgreSQL container stopped');
  }

  if (containers?.redis) {
    await containers.redis.stop();
    console.log('Redis container stopped');
  }
}
