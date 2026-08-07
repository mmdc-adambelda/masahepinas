'use client';

import { useActionState } from 'react';
import { approveRegistration, type AdminUserActionResult } from './actions';

const initialState: AdminUserActionResult = { error: null };

export function ApproveRegistrationForm({ userId }: { userId: string }) {
  const bound = approveRegistration.bind(null, userId);
  const [state, formAction, isPending] = useActionState(bound, initialState);

  return (
    <form action={formAction} className="space-y-1">
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <button type="submit" className="btn-primary text-xs" disabled={isPending}>
        {isPending ? 'Working…' : 'Approve'}
      </button>
    </form>
  );
}
