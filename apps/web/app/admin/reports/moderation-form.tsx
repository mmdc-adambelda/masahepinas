'use client';

import { useActionState } from 'react';
import type { ModerationResult } from './actions';

const initialState: ModerationResult = { error: null };

export function ModerationForm({
  action,
  label,
  variant = 'secondary',
}: {
  action: (prevState: ModerationResult, formData: FormData) => Promise<ModerationResult>;
  label: string;
  variant?: 'secondary' | 'danger';
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input
        type="text"
        name="reason"
        required
        minLength={3}
        placeholder="Reason (required, shown in the audit log)"
        className="input-field text-sm"
      />
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className={
          variant === 'danger'
            ? 'btn-secondary border-danger text-danger text-xs'
            : 'btn-secondary text-xs'
        }
      >
        {isPending ? 'Working…' : label}
      </button>
    </form>
  );
}
