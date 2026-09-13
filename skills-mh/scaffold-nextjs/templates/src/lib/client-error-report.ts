import 'server-only';

import { appendFile } from 'node:fs/promises';
import { z } from 'zod';

export const clientErrorReportSchema = z.strictObject({
  timestamp: z.iso.datetime(),
  message: z.string().min(1),
  page: z.url(),
  stack: z.string().min(1),
});

export type ClientErrorReport = z.infer<typeof clientErrorReportSchema>;

export const DEFAULT_CLIENT_ERROR_LOG_PATH = '/tmp/client-errors.log';

/** JSON Lines keeps embedded newlines in stacks from turning one report into several log lines. */
export function formatClientErrorReport(report: ClientErrorReport): string {
  return JSON.stringify(report);
}

export async function appendClientErrorReport(report: ClientErrorReport): Promise<void> {
  const path = process.env.CLIENT_ERROR_LOG_PATH ?? DEFAULT_CLIENT_ERROR_LOG_PATH;
  await appendFile(path, `${formatClientErrorReport(report)}\n`, 'utf8');
}
