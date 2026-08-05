'use client';

import { useState, useTransition } from 'react';
import { toggleSavedBusiness } from './actions';

export function SavedToggle({
  businessId,
  slug,
  initialSaved,
  isSignedIn,
}: {
  businessId: string;
  slug: string;
  initialSaved: boolean;
  isSignedIn: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  if (!isSignedIn) {
    return (
      <a href="/sign-in" className="btn-secondary">
        Sign in to save
      </a>
    );
  }

  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleSavedBusiness(businessId, slug);
          if (!result.error) setSaved(result.saved);
        })
      }
    >
      {saved ? '★ Saved' : '☆ Save'}
    </button>
  );
}
