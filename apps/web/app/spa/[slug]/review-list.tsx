import type { Review } from '@masahepinas/types';
import { formatRelativeDate } from '@masahepinas/utils';
import { ReportButton } from '@/components/ReportButton';
import { HelpfulButton } from './helpful-button';

export function ReviewList({
  reviews,
  slug,
  votedReviewIds,
  isSignedIn,
}: {
  reviews: Review[];
  slug: string;
  votedReviewIds: Set<string>;
  isSignedIn: boolean;
}) {
  const visible = reviews.filter((r) => r.moderationStatus === 'visible');

  if (visible.length === 0) {
    return (
      <p className="text-sm text-foreground-secondary">No reviews yet — be the first.</p>
    );
  }

  return (
    <div className="space-y-4">
      {visible.map((review) => (
        <article key={review.id} className="card space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{review.customerDisplayName}</p>
              <p className="text-xs text-foreground-secondary">
                {formatRelativeDate(review.createdAt)}
                {review.wasEdited ? ' · edited' : ''}
                {review.isVerifiedVisit ? ' · Verified visit' : ''}
              </p>
            </div>
            <span className="text-sm text-foreground">★ {review.overallRating}</span>
          </div>

          <p className="whitespace-pre-line text-sm text-foreground-secondary">
            {review.body}
          </p>

          {Object.keys(review.categoryRatings).length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs text-foreground-secondary">
              {Object.entries(review.categoryRatings).map(([category, rating]) => (
                <span
                  key={category}
                  className="rounded-full border border-white/10 px-2 py-0.5"
                >
                  {category.replace(/_/g, ' ')}: {rating}
                </span>
              ))}
            </div>
          ) : null}

          {review.reply ? (
            <div className="ml-4 border-l-2 border-brand/40 pl-3">
              <p className="text-xs font-medium text-brand-accent">
                Response from the owner
              </p>
              <p className="text-sm text-foreground-secondary">{review.reply.body}</p>
            </div>
          ) : null}

          <div className="flex items-center gap-4 pt-1">
            <HelpfulButton
              reviewId={review.id}
              slug={slug}
              initialCount={review.helpfulCount}
              initialVoted={votedReviewIds.has(review.id)}
              isSignedIn={isSignedIn}
            />
            {isSignedIn ? (
              <ReportButton targetType="review" targetId={review.id} />
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
