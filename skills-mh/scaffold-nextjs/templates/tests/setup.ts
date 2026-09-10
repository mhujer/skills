import { vi, afterEach } from 'vitest';

import { databaseWasBooted } from './db-boot-state';

// Stubbed so importing the real `@/db` (or anything that reads these) never throws.
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';

// The guard only exists to break client bundles; under Vitest it must be inert.
vi.mock('server-only', () => ({}));

// Every module under test imports `db` directly, so the swap happens here.
vi.mock('@/db', async () => {
  const { testDb } = await import('./test-db');
  return { db: testDb };
});

// Spies rather than no-ops, so a test can assert which paths get revalidated.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Nothing to empty — and nothing to boot — when the test file never reached the database.
afterEach(async () => {
  if (!databaseWasBooted()) return;

  const { truncateAll } = await import('./test-db');
  await truncateAll();
});
