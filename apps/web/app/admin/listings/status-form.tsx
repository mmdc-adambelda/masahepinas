'use client';

import { useActionState } from 'react';
import { setListingStatus, type ListingModerationResult } from './actions';

const initialState: ListingModerationResult = { error: null };

export function StatusForm({
  businessId,
  targetStatus,
  label,
  variant = 'secondary',
}: {
  businessId: string;
  targetStatus: 'verified' | 'unverified' | 'suspended' | 'archived';
  label: string;
  variant?: 'secondary' | 'danger';
}) {
  const bound = setListingStatus.bind(null, businessId, targetStatus);
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
