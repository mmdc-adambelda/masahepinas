import { ResetPasswordForm } from './reset-password-form';

export const metadata = { title: 'Set a new password' };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Set a new password</h1>
        <p className="text-sm text-foreground-secondary">
          Choose a new password for your account.
        </p>
      </div>
      <ResetPasswordForm />
    </main>
  );
}
