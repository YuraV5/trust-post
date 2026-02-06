import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export default async function globalTeardown(): Promise<void> {
  // Get container from global object
  const container = (global as any).__TESTCONTAINER__ as StartedPostgreSqlContainer;
  if (container) {
    await container.stop();
    console.log('PostgreSQL container stopped');
  }
}
