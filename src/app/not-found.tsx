import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-2xl border bg-background p-8 text-center space-y-4">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-primary-foreground hover:opacity-90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
