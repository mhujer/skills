import { appendClientErrorReport, clientErrorReportSchema } from '@/lib/client-error-report';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Malformed client error report.', { status: 400 });
  }

  const report = clientErrorReportSchema.safeParse(body);
  if (!report.success) {
    return new Response('Malformed client error report.', { status: 400 });
  }

  await appendClientErrorReport(report.data);
  return new Response(null, { status: 204 });
}
