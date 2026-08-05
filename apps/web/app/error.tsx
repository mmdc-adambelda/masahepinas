'use client';

import { useEffect } from 'react';
import { logger } from '@masahepinas/utils';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the digest only — never the raw error message/stack in case it
    // carries user input; the digest correlates to server-side logs.
    logger.error('Unhandled error boundary triggered', { digest: error.digest ?? null });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-md text-sm text-foreground-secondary">
        We hit an unexpected error. Please try again, and contact support if it keeps
        happening.
      </p>
      <button type="button" onClick={reset} className="btn-primary">
        Try again
      </button>
    </main>
  );
}
