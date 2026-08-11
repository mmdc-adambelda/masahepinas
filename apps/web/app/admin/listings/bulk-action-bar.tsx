'use client';

import { useActionState } from 'react';
import { bulkApplyListingAction, type BulkListingModerationResult } from './actions';

const initialState: BulkListingModerationResult = { error: null };

export const BULK_FORM_ID = 'bulk-listing-form';

/**
 * The checkboxes that drive this live elsewhere in the listing rows
 * below — each references this form by id via the HTML `form`
 * attribute, so it doesn't have to be a DOM descendant (a checkbox
 * can't be nested inside this form AND inside its own row's individual
 * ListingActionForm at the same time — nested <form> elements aren't
 * valid HTML).
 */
export function BulkActionBar({ canDelete }: { canDelete: boolean }) {
  const [state, formAction, isPending] = useActionState(
    bulkApplyListingAction,
    initialState,
  );

  return (
    <form
      id={BULK_FORM_ID}
      action={formAction}
      className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-brand/40 bg-background-secondary p-3 text-xs shadow-sm"
    >
      <span className="text-foreground-secondary">Bulk action for checked listings:</span>
      <select
        name="action"
        required
        defaultValue=""
        className="input-field w-auto text-xs"
      >
        <option value="" disabled>
          Choose action…
        </option>
        <option value="verified">Verify</option>
        <option value="unverified">Reject</option>
        <option value="suspended">Suspend</option>
        <option value="archived">Archive</option>
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
        {isPending ? 'Working…' : 'Apply to checked'}
      </button>
      {state.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}
      {state.summary ? (
        <p className="w-full text-xs text-brand-accent">
          {state.summary.updated} updated
          {state.summary.failed > 0 ? `, ${state.summary.failed} failed` : ''}.
        </p>
      ) : null}
    </form>
  );
}
