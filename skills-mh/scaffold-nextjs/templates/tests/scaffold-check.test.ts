import { describe, expect, it } from 'vitest';

import { db } from '@/db';
import { scaffoldCheck } from '@/db/schema';

/**
 * Proves the whole test harness end to end: the migrations in `drizzle/` replayed into a
 * PGlite snapshot, `@/db` swapped for it, and the `afterEach` truncation between tests.
 *
 * The two tests are order-dependent on purpose — the second only passes because the first
 * inserted a row and the truncation removed it.
 *
 * Delete this file, the `scaffoldCheck` table and its migration when you write your first
 * real table.
 */
describe('scaffold check', () => {
  it('round-trips a row through the migrated schema', async () => {
    const [inserted] = await db.insert(scaffoldCheck).values({ label: 'hello' }).returning();

    expect(inserted.label).toBe('hello');
    expect(inserted.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(await db.select().from(scaffoldCheck)).toHaveLength(1);
  });

  it('starts from an empty table, because the previous test was truncated', async () => {
    expect(await db.select().from(scaffoldCheck)).toHaveLength(0);
  });
});
