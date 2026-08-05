'use client';

import { useActionState } from 'react';
import { requestPasswordReset, type PasswordResetResult } from '../actions';

const initialState: PasswordResetResult = { error: null, submitted: false };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm text-foreground-secondary">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="input-field"
          autoComplete="email"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : state.submitted ? (
        <p className="text-sm text-foreground-secondary" aria-live="polite">
          If an account exists for that email, a reset link is on its way.
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}
