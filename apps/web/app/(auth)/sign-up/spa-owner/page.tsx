import Link from 'next/link';
import { SpaOwnerSignUpForm } from './spa-owner-sign-up-form';

export const metadata = { title: 'Register as a spa owner' };

export default function SpaOwnerSignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Register your spa</h1>
        <p className="text-sm text-foreground-secondary">
          Create your owner account now — you&apos;ll add your location, hours, services,
          and photos next, once you&apos;re signed in. Listing is free; you can upgrade to
          Premium any time.
        </p>
      </div>

      <SpaOwnerSignUpForm />

      <p className="text-sm text-foreground-secondary">
        Already have an owner account?{' '}
        <Link href="/sign-in" className="text-brand-accent hover:underline">
          Sign in
        </Link>
      </p>
      <p className="text-sm text-foreground-secondary">
        Just here to browse and review?{' '}
        <Link href="/sign-up" className="text-brand-accent hover:underline">
          Create a customer account instead
        </Link>
      </p>
    </main>
  );
}
