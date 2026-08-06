import Link from 'next/link';
import { PREMIUM_PLAN } from '@masahepinas/config';
import { formatPhp } from '@masahepinas/utils';
import { getServerAuthSession } from '@/lib/auth';
import { hasRole } from '@masahepinas/types';

export const metadata = {
  title: 'Masahe Pinas Premium',
  description: 'Get priority placement and a Premium badge for ₱500/month.',
};

export default async function PremiumPlanPage() {
  const session = await getServerAuthSession();
  const isOwner = session ? hasRole(session, 'spa_owner') : false;

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-16 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-accent">
          {PREMIUM_PLAN.name}
        </p>
        <h1 className="text-3xl font-semibold text-foreground">
          Stand out in search with {formatPhp(PREMIUM_PLAN.pricePhp)}/month
        </h1>
        <p className="text-foreground-secondary">
          Listing on Masahe Pinas is always free. Premium adds visibility on top of your
          free listing — it never replaces community reviews or Masahe Pinas Recommended
          status, which stay purely quality-based.
        </p>
      </div>

      <div className="card space-y-3 text-left">
        <h2 className="font-medium text-foreground">What&apos;s included</h2>
        <ul className="space-y-1.5 text-sm text-foreground-secondary">
          <li>✓ A clearly labelled &quot;Premium&quot; badge on your listing</li>
          <li>✓ Priority placement within relevant location and service searches</li>
          <li>✓ Inclusion in premium discovery carousels</li>
          <li>
            ✓ Basic listing analytics (profile views, contact clicks, direction requests)
          </li>
          <li>✓ Priority verification review</li>
        </ul>
      </div>

      <div className="card border-warning/30 text-left text-sm text-foreground-secondary">
        Premium and Sponsored placements are always visibly labelled and never presented
        as an independent editorial recommendation. &quot;Masahe Pinas Recommended&quot;
        is a separate, quality-based designation that Premium status cannot buy — see our{' '}
        <Link href="/terms" className="underline">
          listing policies
        </Link>
        .
      </div>

      {isOwner ? (
        <Link href="/owner/billing" className="btn-primary">
          Manage your subscription
        </Link>
      ) : session ? (
        <Link href="/sign-up/spa-owner" className="btn-primary">
          Register your spa to get started
        </Link>
      ) : (
        <Link href="/sign-up/spa-owner" className="btn-primary">
          List your spa for free
        </Link>
      )}
    </main>
  );
}
