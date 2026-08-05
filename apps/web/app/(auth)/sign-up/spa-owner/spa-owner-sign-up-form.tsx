'use client';

import { useActionState } from 'react';
import { signUpSpaOwner } from '../../actions';
import type { ActionResult } from '../../actions';

const initialState: ActionResult = { error: null };

export function SpaOwnerSignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpSpaOwner, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm text-foreground-secondary">
          Your full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="input-field"
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
        <label htmlFor="contactNumber" className="text-sm text-foreground-secondary">
          Contact number
        </label>
        <input
          id="contactNumber"
          name="contactNumber"
          type="tel"
          required
          placeholder="09XXXXXXXXX"
          className="input-field"
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

      <div className="space-y-1.5">
        <label htmlFor="businessName" className="text-sm text-foreground-secondary">
          Business name
        </label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          required
          className="input-field"
        />
      </div>

      <fieldset className="space-y-2 text-sm text-foreground-secondary">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="acceptedListingPolicies"
            required
            className="mt-1"
          />
          <span>
            I agree to the{' '}
            <a href="/terms" className="underline">
              listing policies
            </a>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="confirmedLegitimateService"
            required
            className="mt-1"
          />
          <span>I confirm this establishment provides legitimate wellness services</span>
        </label>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? 'Creating account…' : 'Create owner account'}
      </button>
    </form>
  );
}
