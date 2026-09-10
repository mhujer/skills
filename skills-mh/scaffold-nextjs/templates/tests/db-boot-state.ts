/**
 * Whether this test file ever reached the database. Kept in its own module so that
 * `tests/setup.ts` can ask the question without importing `./test-db` — importing it
 * is what boots PGlite and replays the migrations.
 */
let booted = false;

export function markDatabaseBooted() {
  booted = true;
}

export function databaseWasBooted() {
  return booted;
}
