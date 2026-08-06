import { formatRelativeDate } from '@masahepinas/utils';
import { requireRole } from '@/lib/auth';
import { getMyBusiness } from '@/lib/spa-businesses';
import { getReviewsForBusiness } from '@/lib/reviews';
import { ReplyForm } from './reply-form';

export const metadata = { title: 'Manage reviews' };

export default async function OwnerReviewsPage() {
  const session = await requireRole('spa_owner');
  const business = await getMyBusiness(session.userId);

  if (!business) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-foreground-secondary">No listing found for your account.</p>
      </main>
    );
  }

  const reviews = (await getReviewsForBusiness(business.id)).filter(
    (r) => r.moderationStatus === 'visible',
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Manage reviews</h1>
        <p className="text-sm text-foreground-secondary">
          Reviews on {business.businessName}. You can reply once per review — there&apos;s
          no option to delete a customer&apos;s review.
        </p>
      </div>

      {reviews.length === 0 ? (
        <p className="text-foreground-secondary">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">
                  {review.customerDisplayName}
                </p>
                <span className="text-sm text-foreground">★ {review.overallRating}</span>
              </div>
              <p className="text-xs text-foreground-secondary">
                {formatRelativeDate(review.createdAt)}
              </p>
              <p className="text-sm text-foreground-secondary">{review.body}</p>

              <ReplyForm
                reviewId={review.id}
                businessId={business.id}
                existingBody={review.reply?.body ?? null}
              />
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
