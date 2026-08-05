'use client';

import { useActionState } from 'react';
import { updatePassword } from './actions';
import type { ActionResult } from '../../(auth)/actions';

const initialState: ActionResult = { error: null };

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm text-foreground-secondary">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="input-field"
          autoComplete="new-password"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
