'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-2xl border bg-background p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          We hit an unexpected error while loading this page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-lg border px-4 hover:bg-muted"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
