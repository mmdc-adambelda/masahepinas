import Link from 'next/link';
import { SignUpForm } from './sign-up-form';

export const metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
        <p className="text-sm text-foreground-secondary">
          Join the Masahe Pinas community to save spas, follow reviewers, and leave your
          own reviews.
        </p>
      </div>

      <SignUpForm />

      <p className="text-sm text-foreground-secondary">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-brand-accent hover:underline">
          Sign in
        </Link>
      </p>
      <p className="text-sm text-foreground-secondary">
        Registering a spa or wellness business?{' '}
        <Link href="/sign-up/spa-owner" className="text-brand-accent hover:underline">
          Register as a spa owner
        </Link>
      </p>
    </main>
  );
}
