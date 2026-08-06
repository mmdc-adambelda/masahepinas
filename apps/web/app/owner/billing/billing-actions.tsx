'use client';

import { useState, useTransition } from 'react';
import { cancelPremium, upgradeToPremium } from './actions';

export function UpgradeButton({ businessId }: { businessId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-primary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await upgradeToPremium(businessId);
            setError(result.error);
          })
        }
      >
        {isPending ? 'Processing…' : 'Upgrade to Premium — ₱500/month (test mode)'}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function CancelButton({ businessId }: { businessId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn-secondary border-danger text-danger"
        onClick={() => setConfirming(true)}
      >
        Cancel Premium
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-warning">
        Cancelling removes Premium placement immediately in this test-mode flow. Your
        listing stays published either way — cancelling never deletes your business.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary border-danger text-danger"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelPremium(businessId);
              setError(result.error);
              if (!result.error) setConfirming(false);
            })
          }
        >
          {isPending ? 'Cancelling…' : 'Confirm cancellation'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setConfirming(false)}
        >
          Keep Premium
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
