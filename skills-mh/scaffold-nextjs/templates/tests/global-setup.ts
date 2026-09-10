import { ensureSchemaSnapshot } from './schema-snapshot';

/**
 * Runs once per test run — and once per watch session, not per rerun — in the main process,
 * before any test file is forked. Every test file then boots from what this leaves behind.
 */
export default async function setup() {
  await ensureSchemaSnapshot();
}
