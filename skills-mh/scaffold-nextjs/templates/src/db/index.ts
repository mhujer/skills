import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

// Reuse the client across hot-reloads in development, so a dev session does not
// open a new pool on every edit.
declare global {
  var _postgresClient: postgres.Sql | undefined;
}

const client = globalThis._postgresClient || postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== 'production') {
  globalThis._postgresClient = client;
}

export const db = drizzle(client, { schema });
