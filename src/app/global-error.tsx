'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <html lang="en">
      <body className="bg-muted/30">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-lg w-full rounded-2xl border bg-background p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold">Application error</h1>
            <p className="text-muted-foreground">
              A critical error occurred while rendering the app.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-primary-foreground hover:opacity-90"
              >
                Reload view
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
      </body>
    </html>
  );
}
