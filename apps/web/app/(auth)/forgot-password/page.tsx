import { ForgotPasswordForm } from './forgot-password-form';

export const metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Reset your password</h1>
        <p className="text-sm text-foreground-secondary">
          Enter your account email and we&apos;ll send you a link to reset your password.
        </p>
      </div>
      <ForgotPasswordForm />
    </main>
  );
}
