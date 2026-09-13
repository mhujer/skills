import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/client-errors/route';
import {
  DEFAULT_CLIENT_ERROR_LOG_PATH,
  formatClientErrorReport,
  type ClientErrorReport,
} from '@/lib/client-error-report';

const appendFile = vi.hoisted(() => vi.fn());

vi.mock('node:fs/promises', () => ({ appendFile }));

const REPORT: ClientErrorReport = {
  timestamp: '2026-09-09T10:11:12.345Z',
  message: 'Widget failed',
  page: 'http://localhost:3000/example',
  stack: 'Error: Widget failed\n    at Widget (widget.tsx:12:3)',
};

function requestWith(body: string) {
  return new Request('http://localhost:3000/api/client-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

beforeEach(() => {
  appendFile.mockReset();
  appendFile.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('client error log lines', () => {
  it('put every field on exactly one line', () => {
    const line = formatClientErrorReport(REPORT);

    expect(line.split('\n')).toHaveLength(1);
    expect(JSON.parse(line)).toEqual(REPORT);
  });
});

describe('the client error route', () => {
  it('accepts a valid report and appends it to the default log', async () => {
    const response = await POST(requestWith(JSON.stringify(REPORT)));

    expect(response.status).toBe(204);
    expect(appendFile).toHaveBeenCalledWith(
      DEFAULT_CLIENT_ERROR_LOG_PATH,
      `${formatClientErrorReport(REPORT)}\n`,
      'utf8'
    );
  });

  it('uses the configured log path', async () => {
    vi.stubEnv('CLIENT_ERROR_LOG_PATH', '/tmp/agent-client-errors.log');

    await POST(requestWith(JSON.stringify(REPORT)));

    expect(appendFile).toHaveBeenCalledWith(
      '/tmp/agent-client-errors.log',
      `${formatClientErrorReport(REPORT)}\n`,
      'utf8'
    );
  });

  it.each([
    ['invalid JSON', '{'],
    ['a missing field', JSON.stringify({ message: REPORT.message })],
    ['an invalid field', JSON.stringify({ ...REPORT, page: 'not a URL' })],
    ['an extra field', JSON.stringify({ ...REPORT, noise: true })],
  ])('rejects %s without writing', async (_case, body) => {
    const response = await POST(requestWith(body));

    expect(response.status).toBe(400);
    expect(appendFile).not.toHaveBeenCalled();
  });
});
