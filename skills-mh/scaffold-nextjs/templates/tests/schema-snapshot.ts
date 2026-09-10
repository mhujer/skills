import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

/**
 * A PGlite data directory with the migrations in `drizzle/` already replayed, cached on disk.
 * Unpacking one is several times cheaper than the `initdb` an empty PGlite runs, and every
 * test file pays that cost.
 */

async function exists(file: string) {
  return fs.stat(file).then(
    () => true,
    () => false
  );
}

const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
const cacheDir = path.resolve(process.cwd(), 'node_modules/.cache/pglite');

/**
 * Names the snapshot after a digest of everything it was built from, so a stale one is never
 * found rather than being found and trusted. Editing a migration, adding one, or upgrading
 * PGlite — whose data directory format is not guaranteed across versions — all yield a new name.
 */
async function snapshotFilename() {
  const digest = createHash('sha256');

  const pgliteManifest = await fs.readFile(
    path.resolve(process.cwd(), 'node_modules/@electric-sql/pglite/package.json'),
    'utf8'
  );
  digest.update((JSON.parse(pgliteManifest) as { version: string }).version);

  const entries = await fs.readdir(migrationsFolder, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();

  for (const file of files) {
    digest.update(path.relative(migrationsFolder, file));
    digest.update(await fs.readFile(file));
  }

  return `schema-${digest.digest('hex').slice(0, 16)}.tar`;
}

export async function schemaSnapshotPath() {
  return path.join(cacheDir, await snapshotFilename());
}

/**
 * Build the snapshot unless the cache already holds one for this exact set of migrations.
 * Called once per run from the global setup, so the forked test processes only ever read it.
 */
export async function ensureSchemaSnapshot() {
  const target = await schemaSnapshotPath();

  if (await exists(target)) return;

  const pglite = new PGlite();
  // Replaying the real migrations, rather than pushing `src/db/schema.ts`, is what makes a
  // broken or drifted migration fail the test run instead of passing unnoticed.
  await migrate(drizzle({ client: pglite }), { migrationsFolder });

  // Uncompressed: gzip costs more to produce and to unpack in every test process than the
  // disk it saves in a cache directory that npm wipes anyway.
  const dump = await pglite.dumpDataDir('none');
  await pglite.close();

  await fs.mkdir(cacheDir, { recursive: true });

  // Written under a private name and renamed into place, so two test runs starting together
  // cannot leave a half-written data directory behind for the other to boot from.
  const partial = `${target}.${process.pid}.partial`;
  await fs.writeFile(partial, Buffer.from(await dump.arrayBuffer()));
  await fs.rename(partial, target);

  await pruneSupersededSnapshots(path.basename(target));
}

/**
 * Snapshots are tens of megabytes each and only the current one is ever read. Matching on the
 * `.tar` suffix rather than the `schema-` prefix leaves alone the `.partial` file another run
 * may be part-way through writing — deleting that would fail its rename and take the run down.
 */
async function pruneSupersededSnapshots(keep: string) {
  const entries = await fs.readdir(cacheDir);

  await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.tar') && entry !== keep)
      .map((entry) => fs.rm(path.join(cacheDir, entry), { force: true }))
  );
}
