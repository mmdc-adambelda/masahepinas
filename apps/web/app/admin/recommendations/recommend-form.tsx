'use client';

import { useActionState } from 'react';
import { setRecommended, type RecommendationResult } from './actions';

const initialState: RecommendationResult = { error: null };

export function RecommendForm({
  businessId,
  isRecommended,
}: {
  businessId: string;
  isRecommended: boolean;
}) {
  const bound = setRecommended.bind(null, businessId, !isRecommended);
  const [state, formAction, isPending] = useActionState(bound, initialState);

  return (
    <form action={formAction} className="space-y-1.5">
      {!isRecommended ? (
        <textarea
          name="criteriaNotes"
          rows={2}
          placeholder="Why does this listing qualify? (strong reviews, complete info, verified, etc.)"
          className="input-field text-xs"
        />
      ) : (
        <input type="hidden" name="criteriaNotes" value="Unmarked by superadmin" />
      )}
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <button type="submit" className="btn-secondary text-xs" disabled={isPending}>
        {isPending ? 'Saving…' : isRecommended ? 'Remove recommendation' : 'Mark as Recommended'}
      </button>
    </form>
  );
}
