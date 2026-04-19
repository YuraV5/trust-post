/* eslint-disable */
import * as fs from 'fs';
import { ENV_SNAPSHOT_FILE } from './global-setup';

export default async function globalTeardown(): Promise<void> {
  console.log('\n[testcontainers] Stopping containers...');

  await Promise.all([
    global.__pg_container__?.stop({ timeout: 10000 }),
    global.__redis_container__?.stop({ timeout: 10000 }),
  ]);

  if (fs.existsSync(ENV_SNAPSHOT_FILE)) {
    fs.unlinkSync(ENV_SNAPSHOT_FILE);
  }

  console.log('[testcontainers] Containers stopped.');
}
