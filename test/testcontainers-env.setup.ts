/**
 * Loaded via Jest `setupFiles` — runs in every worker process before the test framework
 * is installed. At this point `process.env` is already populated from the dotenv-cli
 * pre-load (`.env.test`). We only need to override the three values that depend on the
 * dynamically-assigned container ports written by globalSetup.
 */
import * as fs from 'fs';
import * as path from 'path';

const ENV_SNAPSHOT_FILE = path.join(__dirname, '.testcontainers.env.json');

if (fs.existsSync(ENV_SNAPSHOT_FILE)) {
  const snapshot: Record<string, string> = JSON.parse(fs.readFileSync(ENV_SNAPSHOT_FILE, 'utf-8'));
  Object.assign(process.env, snapshot);
}

// Keep queue/job failures visible during e2e runs unless explicitly overridden.
process.env.LOGGER_CONSOLE_ENABLED = process.env.LOGGER_CONSOLE_ENABLED ?? 'true';
process.env.LOGGER_LEVEL = process.env.LOGGER_LEVEL ?? 'debug';
