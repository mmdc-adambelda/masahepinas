export const metadata = { title: 'Appeal submitted' };

export default function AppealSubmittedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Appeal submitted</h1>
      <p className="text-sm text-foreground-secondary">
        A moderator will review your appeal and get back to you.
      </p>
    </main>
  );
}
