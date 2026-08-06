'use client';

import { useTransition } from 'react';
import { removeFeaturedPlacement } from './actions';

export function RemoveButton({ placementId }: { placementId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="text-xs text-danger hover:underline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await removeFeaturedPlacement(placementId);
        })
      }
    >
      {isPending ? 'Removing…' : 'Remove'}
    </button>
  );
}
