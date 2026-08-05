import Link from 'next/link';
import { SignInForm } from './sign-in-form';

export const metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
        <p className="text-sm text-foreground-secondary">
          Sign in to save spas, follow reviewers, and manage your account.
        </p>
      </div>

      <SignInForm />

      <p className="text-sm text-foreground-secondary">
        New here?{' '}
        <Link href="/sign-up" className="text-brand-accent hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
