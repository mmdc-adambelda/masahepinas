'use client';

import { useActionState } from 'react';
import { approveClaim, rejectClaim, type ClaimModerationResult } from './actions';

const initialState: ClaimModerationResult = { error: null };

export function ClaimForm({
  claimId,
  action,
  label,
  variant = 'secondary',
}: {
  claimId: string;
  action: 'approve' | 'reject';
  label: string;
  variant?: 'secondary' | 'danger';
}) {
  const bound = (action === 'approve' ? approveClaim : rejectClaim).bind(null, claimId);
  const [state, formAction, isPending] = useActionState(bound, initialState);

  return (
    <form action={formAction} className="space-y-1.5">
      <input
        type="text"
        name="reason"
        required
        minLength={3}
        placeholder="Reason"
        className="input-field text-xs"
      />
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className={`btn-secondary text-xs ${variant === 'danger' ? 'border-danger text-danger' : ''}`}
      >
        {isPending ? 'Working…' : label}
      </button>
    </form>
  );
}
