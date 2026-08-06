import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listListingsByStatus } from '@/lib/admin';
import { StatusForm } from './status-form';

export const metadata = { title: 'Listing verification' };

const FILTERS = [
  'pending_review',
  'verified',
  'unverified',
  'suspended',
  'archived',
  'all',
] as const;

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole('moderator');
  const { status: rawStatus } = await searchParams;
  const status = FILTERS.includes(rawStatus as (typeof FILTERS)[number])
    ? (rawStatus as (typeof FILTERS)[number])
    : 'pending_review';

  const listings = await listListingsByStatus(status);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Listing verification</h1>
        <p className="text-sm text-foreground-secondary">
          Every status change is logged with your reason to{' '}
          <code>moderation_actions</code>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/listings?status=${f}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              status === f
                ? 'border-brand text-brand-accent'
                : 'border-white/10 text-foreground-secondary'
            }`}
          >
            {f.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <p className="text-foreground-secondary">No listings in this status.</p>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <article key={listing.id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/spa/${listing.slug}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {listing.businessName}
                  </Link>
                  <p className="text-xs text-foreground-secondary">
                    Status: {listing.status} · {listing.ownerId ? 'Claimed' : 'Unclaimed'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatusForm
                  businessId={listing.id}
                  targetStatus="verified"
                  label="Verify"
                />
                <StatusForm
                  businessId={listing.id}
                  targetStatus="unverified"
                  label="Reject"
                  variant="danger"
                />
                <StatusForm
                  businessId={listing.id}
                  targetStatus="suspended"
                  label="Suspend"
                  variant="danger"
                />
                <StatusForm
                  businessId={listing.id}
                  targetStatus="archived"
                  label="Archive"
                  variant="danger"
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
