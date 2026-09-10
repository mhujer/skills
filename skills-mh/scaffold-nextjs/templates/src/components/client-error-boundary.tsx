'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

import type { ClientErrorReport } from '@/lib/client-error-report';

const MISSING_STACK = 'No stack was available.';

function errorDetails(reason: unknown): { message: string; stack: string } {
  if (reason instanceof Error) {
    return {
      message: reason.message || reason.name,
      stack: reason.stack || MISSING_STACK,
    };
  }

  if (typeof reason === 'string') {
    return { message: reason || 'Unknown error', stack: MISSING_STACK };
  }

  try {
    return { message: JSON.stringify(reason) || String(reason), stack: MISSING_STACK };
  } catch {
    return { message: String(reason), stack: MISSING_STACK };
  }
}

function reportClientError(reason: unknown, stackOverride?: string) {
  try {
    const details = errorDetails(reason);
    const report: ClientErrorReport = {
      timestamp: new Date().toISOString(),
      message: details.message,
      page: window.location.href,
      stack: stackOverride || details.stack,
    };

    void fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Error reporting must never become another error visible to the reader.
  }
}

type Failure = { message: string; stack: string; componentStack?: string };

/*
 * The topmost frame of React's component stack — "at Reader" out of "\n at Reader (…)\n at …".
 * Worth pulling out because it is the one line that says which component broke, and the whole
 * stack is behind a disclosure. The shape is React's, not a contract: a frame it words some
 * other way yields nothing and the caller simply omits the line, which is why this may return
 * undefined rather than guessing.
 */
function failingComponent(componentStack: string | undefined): string | undefined {
  const frame = componentStack
    ?.split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('at '));

  return frame?.slice(3).split(' ')[0] || undefined;
}

/** Both stacks as one block — what gets reported, and what the disclosure shows. */
function fullStack({ stack, componentStack }: Pick<Failure, 'stack' | 'componentStack'>): string {
  return [stack, componentStack].filter(Boolean).join('\n');
}

type Props = { children: ReactNode };
type State = { failure: Failure | null };

export class ClientErrorBoundary extends Component<Props, State> {
  state: State = { failure: null };

  static getDerivedStateFromError(error: unknown): State {
    return { failure: errorDetails(error) };
  }

  componentDidMount() {
    window.addEventListener('error', this.handleScriptError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleScriptError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  /*
   * Runs after `getDerivedStateFromError` has already put the failure on screen, and only to add
   * what React withholds until now: the component stack. The extra render that costs is the price
   * of naming the component that broke.
   */
  componentDidCatch(error: Error, info: ErrorInfo) {
    const componentStack = info.componentStack ?? undefined;

    reportClientError(error, fullStack({ stack: error.stack ?? MISSING_STACK, componentStack }));
    this.setState({ failure: { ...errorDetails(error), componentStack } });
  }

  private handleScriptError = (event: ErrorEvent) => {
    const location = event.filename ? `at ${event.filename}:${event.lineno}:${event.colno}` : MISSING_STACK;
    reportClientError(event.error ?? event.message, event.error?.stack || location);
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportClientError(event.reason);
  };

  render() {
    const { failure } = this.state;

    if (failure) {
      const component = failingComponent(failure.componentStack);

      /*
       * Shows the real message rather than a generic apology. Next's own overlay has it too, but
       * collapsed behind a badge in the corner — this puts what broke on the screen and keeps only
       * the stacks a click away. Replace it with a user-facing fallback before this renders for
       * anyone who should not see stacks.
       */
      return (
        <main className="mx-auto flex max-w-3xl flex-col gap-4 p-8">
          <h1 className="text-2xl font-semibold">Something went wrong.</h1>

          <p className="text-destructive font-mono text-sm break-words">{failure.message}</p>

          {component && (
            <p className="text-muted-foreground text-sm">
              Thrown while rendering <span className="font-mono">{component}</span>.
            </p>
          )}

          <details className="border-border border-t pt-4">
            <summary className="text-muted-foreground cursor-pointer text-sm">Stack</summary>
            <pre className="text-muted-foreground mt-2 overflow-x-auto text-xs leading-5 whitespace-pre-wrap">
              {fullStack(failure)}
            </pre>
          </details>

          <p className="text-muted-foreground text-sm">
            The error was recorded.{' '}
            <button className="underline" type="button" onClick={() => window.location.reload()}>
              Reload
            </button>{' '}
            to try again.
          </p>
        </main>
      );
    }

    return this.props.children;
  }
}
