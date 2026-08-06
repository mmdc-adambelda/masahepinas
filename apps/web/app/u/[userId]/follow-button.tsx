'use client';

import { useState, useTransition } from 'react';
import { toggleFollow } from './actions';

export function FollowButton({
  targetUserId,
  initialFollowing,
  isSignedIn,
  isSelf,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  isSignedIn: boolean;
  isSelf: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  if (isSelf) return null;
  if (!isSignedIn) {
    return (
      <a href="/sign-in" className="btn-secondary">
        Sign in to follow
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleFollow(targetUserId);
          if (!result.error) setFollowing(result.following);
        })
      }
      className={following ? 'btn-secondary' : 'btn-primary'}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
