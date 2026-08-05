'use client';

import { useActionState } from 'react';
import { signUpCustomer, type ActionResult } from '../actions';

const initialState: ActionResult = { error: null };

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpCustomer, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="displayName" className="text-sm text-foreground-secondary">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          minLength={2}
          maxLength={60}
          className="input-field"
          autoComplete="nickname"
        />
      </div>

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

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm text-foreground-secondary">
          Password
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="city" className="text-sm text-foreground-secondary">
            City (optional)
          </label>
          <input id="city" name="city" type="text" className="input-field" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="province" className="text-sm text-foreground-secondary">
            Province (optional)
          </label>
          <input id="province" name="province" type="text" className="input-field" />
        </div>
      </div>

      <fieldset className="space-y-2 text-sm text-foreground-secondary">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="acceptedTermsOfService"
            required
            className="mt-1"
          />
          <span>
            I agree to the{' '}
            <a href="/terms" className="underline">
              Terms of Service
            </a>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="acceptedPrivacyPolicy" required className="mt-1" />
          <span>
            I agree to the{' '}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="confirmedTruthfulReviews"
            required
            className="mt-1"
          />
          <span>I confirm that any reviews I submit will be truthful</span>
        </label>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
