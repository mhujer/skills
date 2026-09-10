import fs from 'node:fs/promises';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import * as schema from '@/db/schema';

import { markDatabaseBooted } from './db-boot-state';
import { schemaSnapshotPath } from './schema-snapshot';

// The schema arrives as a data directory built by replaying the real migrations, so a broken
// migration still fails the test run. `tests/global-setup.ts` builds it once for the whole run;
// unpacking it here costs a fraction of what booting an empty Postgres would.
const snapshot = await readSchemaSnapshot();

const pglite = new PGlite({ loadDataDir: new Blob([snapshot]) });

/** In-memory stand-in for `@/db`, swapped in by `tests/setup.ts`. */
export const testDb = drizzle({ client: pglite, schema });

markDatabaseBooted();

// `loadDataDir` does not block on the boot it starts. Without this, the cost lands on whichever
// test queries first and reads as a slow test rather than as setup.
await pglite.waitReady;

// A migration that seeds a row would leave it here for the first test of every file, and the
// `afterEach` below would then clear it for the rest — so every test would see a different
// world depending on where it sat in the file. Emptying once at boot makes them all agree.
await truncateAll();

async function readSchemaSnapshot() {
  const file = await schemaSnapshotPath();

  try {
    return new Uint8Array(await fs.readFile(file));
  } catch (cause) {
    throw new Error(
      `No schema snapshot at ${file}. It is named after a digest of the migrations, and only ` +
        `tests/global-setup.ts builds it — which runs when vitest starts, not on a watch rerun. ` +
        `If you have just changed something in drizzle/, restart vitest.`,
      { cause }
    );
  }
}

/**
 * Empty every table. The list comes from the catalog rather than being hardcoded,
 * so a new table in the schema needs no change here. Drizzle keeps its migration
 * bookkeeping in the `drizzle` schema, so filtering on `public` leaves it intact.
 */
export async function truncateAll() {
  const { rows } = await pglite.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );

  if (rows.length === 0) return;

  const tableList = rows.map((row) => `"${row.tablename}"`).join(', ');
  await pglite.exec(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}
