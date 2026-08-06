'use client';

import { useActionState } from 'react';
import type { AdminUserActionResult } from './actions';

const initialState: AdminUserActionResult = { error: null };

export function UserActionForm({
  action,
  label,
  variant = 'secondary',
}: {
  action: (
    prevState: AdminUserActionResult,
    formData: FormData,
  ) => Promise<AdminUserActionResult>;
  label: string;
  variant?: 'secondary' | 'danger';
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

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
