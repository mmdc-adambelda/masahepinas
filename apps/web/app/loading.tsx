export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-3" role="status" aria-label="Loading">
        <div className="h-4 w-1/3 animate-pulse rounded bg-surface-elevated" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-surface-elevated" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-surface-elevated" />
      </div>
    </main>
  );
}
