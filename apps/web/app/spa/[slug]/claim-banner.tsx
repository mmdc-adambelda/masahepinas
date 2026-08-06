'use client';

import { useActionState } from 'react';
import { submitClaim, type ClaimResult } from './claim-actions';

const initialState: ClaimResult = { error: null };

export function ClaimBanner({
  businessId,
  isSignedIn,
}: {
  businessId: string;
  isSignedIn: boolean;
}) {
  const bound = submitClaim.bind(null, businessId);
  const [state, formAction, isPending] = useActionState(bound, initialState);

  if (state.success) {
    return (
      <div className="card border-brand/40 text-sm text-brand-accent">
        Claim submitted — a moderator will review it soon.
      </div>
    );
  }

  return (
    <div className="card space-y-2 border-warning/40">
      <p className="text-sm text-warning">
        This listing hasn&apos;t been claimed by its owner yet. Is this your business?
      </p>
      {isSignedIn ? (
        <form action={formAction} className="space-y-2">
          <textarea
            name="notes"
            rows={2}
            placeholder="Optional: tell us how we can verify you own this business"
            className="input-field text-sm"
          />
          {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
          <button type="submit" className="btn-secondary text-xs" disabled={isPending}>
            {isPending ? 'Submitting…' : 'Claim this business'}
          </button>
        </form>
      ) : (
        <a href="/sign-in" className="text-sm text-brand-accent hover:underline">
          Sign in to claim this business
        </a>
      )}
    </div>
  );
}
