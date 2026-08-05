import Link from 'next/link';

export const metadata = { title: 'Register as a spa owner' };

/**
 * Full spa owner registration (business details, map pin, hours, services,
 * verification uploads) is a Phase 2 deliverable — it depends on the
 * business/location/hours/services schema and image upload pipeline built
 * in that phase (see docs/development-roadmap.md, Phase 2). This
 * placeholder exists now so the route referenced from sign-up resolves and
 * so the requirement isn't silently dropped.
 */
export default function SpaOwnerSignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">
        Register your spa — coming soon
      </h1>
      <p className="text-sm text-foreground-secondary">
        Full spa owner registration (business details, location pin, hours, services, and
        verification) ships in Phase 2 of development. For now you can create a customer
        account and check back soon.
      </p>
      <Link href="/sign-up" className="btn-secondary">
        Create a customer account instead
      </Link>
    </main>
  );
}
