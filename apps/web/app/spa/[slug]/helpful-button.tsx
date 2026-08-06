'use client';

import { useState, useTransition } from 'react';
import { toggleHelpfulVote } from './review-actions';

export function HelpfulButton({
  reviewId,
  slug,
  initialCount,
  initialVoted,
  isSignedIn,
}: {
  reviewId: string;
  slug: string;
  initialCount: number;
  initialVoted: boolean;
  isSignedIn: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [isPending, startTransition] = useTransition();

  if (!isSignedIn) {
    return <span className="text-xs text-foreground-secondary">Helpful ({count})</span>;
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleHelpfulVote(reviewId, slug);
          if (!result.error) {
            setVoted(result.helpful);
            setCount((c) => c + (result.helpful ? 1 : -1));
          }
        })
      }
      className={`text-xs ${voted ? 'text-brand-accent' : 'text-foreground-secondary hover:text-foreground'}`}
    >
      {voted ? '✓ Helpful' : 'Helpful'} ({count})
    </button>
  );
}
