'use client';

import { useActionState } from 'react';
import { submitAppeal, type AppealSubmitResult } from './actions';

const initialState: AppealSubmitResult = { error: null };

export function AppealForm({ actionId }: { actionId: string }) {
  const bound = submitAppeal.bind(null, actionId);
  const [state, formAction, isPending] = useActionState(bound, initialState);

  return (
    <form action={formAction} className="card space-y-3">
      <textarea
        name="message"
        rows={5}
        required
        minLength={10}
        placeholder="Explain why this decision should be reconsidered…"
        className="input-field"
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Submitting…' : 'Submit appeal'}
      </button>
    </form>
  );
}
