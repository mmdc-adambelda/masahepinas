export const metadata = { title: 'Check your email' };

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
      <p className="text-sm text-foreground-secondary">
        We sent a verification link to your inbox. Confirm your email to finish setting up
        your Masahe Pinas account.
      </p>
    </main>
  );
}
