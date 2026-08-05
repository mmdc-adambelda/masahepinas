import Link from 'next/link';
import { APP_NAME, APP_TAGLINE, PREMIUM_PLAN } from '@masahepinas/config';
import { formatPhp } from '@masahepinas/utils';

/**
 * Phase 1 placeholder homepage. The full hero/premium/recommended/location/
 * service sections from docs/product-requirements.md §27 land in Phase 2+
 * once listing data exists to render. This page exists to prove the app
 * boots, is styled with the shared dark theme tokens, and links to the
 * auth foundations built in this phase.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-accent">
          {APP_NAME}
        </p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          {APP_TAGLINE}
        </h1>
        <p className="mx-auto max-w-xl text-foreground-secondary">
          Search by location, therapist availability, service, rating, or Masahe Pinas
          recommendation. Read community reviews and find the right wellness experience
          for you.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/sign-up" className="btn-primary">
          Get started
        </Link>
        <Link href="/sign-in" className="btn-secondary">
          Sign in
        </Link>
      </div>

      <div className="card w-full max-w-md text-left">
        <h2 className="text-sm font-medium text-foreground">List your spa for free</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          Upgrade to {PREMIUM_PLAN.name} for {formatPhp(PREMIUM_PLAN.pricePhp)}/
          {PREMIUM_PLAN.billingCycle.replace('ly', '')} for extra visibility.
        </p>
      </div>

      <p className="text-xs text-foreground-secondary">
        Phase 1 build — directory, search, and reviews land in later phases. See{' '}
        <code className="text-foreground">docs/development-roadmap.md</code>.
      </p>
    </main>
  );
}
