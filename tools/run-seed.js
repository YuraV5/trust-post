#!/usr/bin/env node

const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = resolve(__dirname, '..');
const sourceEntry = resolve(rootDir, 'tools', 'seeds.ts');
const distEntry = resolve(rootDir, 'dist', 'tools', 'seeds.js');

function resolveSeedCommand() {
  if (existsSync(sourceEntry)) {
    try {
      return [process.execPath, [require.resolve('ts-node/dist/bin.js'), sourceEntry]];
    } catch {
      // Fall back to compiled entry when dev dependencies are not available.
    }
  }

  if (existsSync(distEntry)) {
    return [process.execPath, [distEntry]];
  }

  console.error('❌ Unable to find a runnable seed entry. Build the project or install dev dependencies.');
  process.exit(1);
}

const [command, baseArgs] = resolveSeedCommand();
const result = spawnSync(command, [...baseArgs, ...process.argv.slice(2)], {
  cwd: rootDir,
  stdio: 'inherit',
});

if (result.error) {
  console.error('❌ Seed launcher failed:', result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);