import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * The scaffold's worked example. It exists so the PGlite test harness arrives proven:
 * `tests/scaffold-check.test.ts` round-trips a row through a real migration.
 *
 * Delete this table, its migration in `drizzle/`, and that test when you write your
 * first real table.
 */
export const scaffoldCheck = pgTable('scaffold_check', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
