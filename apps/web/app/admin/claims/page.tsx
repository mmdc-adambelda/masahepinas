import Link from 'next/link';
import { formatRelativeDate } from '@masahepinas/utils';
import { requireRole } from '@/lib/auth';
import { listPendingClaims } from '@/lib/admin';
import { ClaimForm } from './claim-form';

export const metadata = { title: 'Business claims' };

export default async function AdminClaimsPage() {
  await requireRole('moderator');
  const claims = await listPendingClaims();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Business claims</h1>
        <p className="text-sm text-foreground-secondary">
          Approving a claim reassigns the listing to the claimant and grants them the spa
          owner role.
        </p>
      </div>

      {claims.length === 0 ? (
        <p className="text-foreground-secondary">No pending claims.</p>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <article key={claim.id} className="card space-y-3">
              <div>
                <Link
                  href={`/spa/${claim.businessSlug}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {claim.businessName}
                </Link>
                <p className="text-xs text-foreground-secondary">
                  Claimed by{' '}
                  <Link href={`/u/${claim.claimantUserId}`} className="hover:underline">
                    {claim.claimantDisplayName}
                  </Link>{' '}
                  · {formatRelativeDate(claim.createdAt)}
                </p>
              </div>
              {claim.notes ? (
                <p className="text-sm text-foreground-secondary">{claim.notes}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <ClaimForm claimId={claim.id} action="approve" label="Approve" />
                <ClaimForm
                  claimId={claim.id}
                  action="reject"
                  label="Reject"
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
