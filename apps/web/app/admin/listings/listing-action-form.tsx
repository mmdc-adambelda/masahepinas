'use client';

import { useActionState } from 'react';
import { applyListingAction, type ListingModerationResult } from './actions';

const initialState: ListingModerationResult = { error: null };

export function ListingActionForm({
  businessId,
  currentStatus,
  canDelete,
}: {
  businessId: string;
  currentStatus: string;
  canDelete: boolean;
}) {
  const bound = applyListingAction.bind(null, businessId);
  const [state, formAction, isPending] = useActionState(bound, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <select
        name="action"
        required
        defaultValue=""
        className="input-field w-auto text-xs"
      >
        <option value="" disabled>
          Choose action…
        </option>
        <option value="verified" disabled={currentStatus === 'verified'}>
          Verify
        </option>
        <option value="unverified" disabled={currentStatus === 'unverified'}>
          Reject
        </option>
        <option value="suspended" disabled={currentStatus === 'suspended'}>
          Suspend
        </option>
        <option value="archived" disabled={currentStatus === 'archived'}>
          Archive
        </option>
        {canDelete ? <option value="deleted">Delete</option> : null}
      </select>
      <input
        type="text"
        name="reason"
        required
        minLength={3}
        placeholder="Reason"
        className="input-field w-auto min-w-[10rem] flex-1 text-xs"
      />
      <button type="submit" className="btn-secondary text-xs" disabled={isPending}>
        {isPending ? 'Working…' : 'Apply'}
      </button>
      {state.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
