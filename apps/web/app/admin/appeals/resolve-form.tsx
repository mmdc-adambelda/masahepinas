'use client';

import { useActionState } from 'react';
import { resolveAppeal, type AppealResolutionResult } from './actions';

const initialState: AppealResolutionResult = { error: null };

export function ResolveForm({
  appealId,
  outcome,
  label,
}: {
  appealId: string;
  outcome: 'upheld' | 'overturned';
  label: string;
}) {
  const bound = resolveAppeal.bind(null, appealId, outcome);
  const [state, formAction, isPending] = useActionState(bound, initialState);

  return (
    <form action={formAction} className="space-y-1.5">
      <input
        type="text"
        name="notes"
        required
        minLength={3}
        placeholder="Resolution note"
        className="input-field text-xs"
      />
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <button type="submit" className="btn-secondary text-xs" disabled={isPending}>
        {isPending ? 'Working…' : label}
      </button>
    </form>
  );
}
