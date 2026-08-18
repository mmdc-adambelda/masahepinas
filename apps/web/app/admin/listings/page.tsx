import Link from 'next/link';
import { hasRole } from '@masahepinas/types';
import { requireRole } from '@/lib/auth';
import { listListingsByStatus } from '@/lib/admin';
import { AdminBackLink } from '../back-link';
import { BULK_FORM_ID, BulkActionBar } from './bulk-action-bar';
import { ListingActionForm } from './listing-action-form';
import { SelectAllCheckbox } from './select-all-checkbox';

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
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await requireRole('moderator');
  const { status: rawStatus, q } = await searchParams;
  const status = FILTERS.includes(rawStatus as (typeof FILTERS)[number])
    ? (rawStatus as (typeof FILTERS)[number])
    : 'pending_review';
  const isSuperadmin = hasRole(session, 'superadmin');

  const listings = await listListingsByStatus(status, q);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <AdminBackLink />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Listing verification</h1>
        <p className="text-sm text-foreground-secondary">
          Every action is logged with your reason to <code>moderation_actions</code>.
          {isSuperadmin ? ' Only superadmins can delete a listing.' : ''}
        </p>
      </div>

      <form className="flex gap-2">
        <input type="hidden" name="status" value={status} />
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by business name"
          className="input-field flex-1"
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/listings?status=${f}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
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
        <p className="text-foreground-secondary">No listings match this filter.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SelectAllCheckbox formId={BULK_FORM_ID} />
          </div>
          <BulkActionBar canDelete={isSuperadmin} />
          {listings.map((listing) => (
            <article key={listing.id} className="card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="businessIds"
                    value={listing.id}
                    form={BULK_FORM_ID}
                    className="mt-1"
                    aria-label={`Select ${listing.businessName}`}
                  />
                  <div>
                    <Link
                      href={`/spa/${listing.slug}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {listing.businessName}
                    </Link>
                    <p className="text-xs text-foreground-secondary">
                      Status: {listing.status} ·{' '}
                      {listing.ownerId ? 'Claimed' : 'Unclaimed'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <Link
                    href={`/admin/spas/${listing.id}/edit`}
                    className="text-brand-accent hover:underline"
                  >
                    {isSuperadmin ? 'Edit' : 'Logo/photos'}
                  </Link>
                  {listing.verificationDocumentUrl ? (
                    <a
                      href={listing.verificationDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-accent hover:underline"
                    >
                      View verification document ↗
                    </a>
                  ) : null}
                </div>
              </div>
              {listing.internalContact ? (
                <div className="rounded-md border border-white/10 bg-background-secondary p-2 text-xs text-foreground-secondary">
                  <span className="font-medium text-foreground">
                    Internal contact (staff only, not public):
                  </span>{' '}
                  {[
                    listing.internalContact.ownerName,
                    listing.internalContact.ownerPhone,
                    listing.internalContact.ownerEmail,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'None on file'}
                </div>
              ) : null}
              <ListingActionForm
                businessId={listing.id}
                currentStatus={listing.status}
                canDelete={isSuperadmin}
              />
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
