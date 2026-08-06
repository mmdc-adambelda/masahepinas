import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { getMyBusiness } from '@/lib/spa-businesses';
import { getOwnerDashboardStats } from '@/lib/analytics';

export const metadata = { title: 'Owner dashboard' };

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending review',
  verified: 'Verified',
  unverified: 'Unverified',
  suspended: 'Suspended',
  archived: 'Archived',
};

export default async function OwnerDashboardPage() {
  const session = await requireRole('spa_owner');
  const business = await getMyBusiness(session.userId);

  if (!business) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-foreground-secondary">No listing found for your account.</p>
      </main>
    );
  }

  const stats = await getOwnerDashboardStats(business.id);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          {business.businessName}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-brand/40 px-2 py-0.5 text-brand-accent">
            {STATUS_LABELS[stats.status] ?? stats.status}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-foreground-secondary">
            {business.isPremium ? 'Premium' : 'Free plan'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Average rating" value={stats.averageRating.toFixed(1)} />
        <StatCard label="Reviews" value={String(stats.reviewCount)} />
        <StatCard label="Saved by" value={String(stats.savedCount)} />
        <StatCard
          label="Response rate"
          value={`${Math.round(stats.responseRate * 100)}%`}
        />
        <StatCard label="Profile views" value={String(stats.profileViews)} />
        <StatCard label="Contact clicks" value={String(stats.contactClicks)} />
        <StatCard label="Direction requests" value={String(stats.directionClicks)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/submit-a-spa" className="btn-primary">
          Edit listing
        </Link>
        <Link href="/owner/reviews" className="btn-secondary">
          Manage reviews
        </Link>
        <Link href="/owner/billing" className="btn-secondary">
          Subscription
        </Link>
        <Link href={`/spa/${business.slug}`} className="btn-secondary">
          View public listing
        </Link>
      </div>

      {stats.status !== 'verified' ? (
        <div className="card border-warning/40 text-sm text-warning">
          Your listing is {STATUS_LABELS[stats.status]?.toLowerCase() ?? stats.status} — a
          moderator reviews new and updated listings before they&apos;re marked verified.
          Complete your business details, location, and at least one photo on{' '}
          <Link href="/submit-a-spa" className="underline">
            Edit listing
          </Link>{' '}
          to speed this up.
        </div>
      ) : null}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-foreground-secondary">{label}</p>
    </div>
  );
}
