import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    // Production runs in UTC. Tests match production rather than the container, so a date
    // derived from the clock fails here instead of passing by accident and breaking deployed.
    env: { TZ: 'UTC' },
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    setupFiles: ['./tests/setup.ts'],
    // Builds the PGlite schema snapshot once, before any test file is forked.
    globalSetup: ['./tests/global-setup.ts'],
    // Each test file gets its own PGlite instance, so files are free to run concurrently.
    // `maxWorkers` is left unset: Vitest derives it from the machine (cores - 1).
    pool: 'forks',
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
