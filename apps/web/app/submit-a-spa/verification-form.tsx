'use client';

import { useActionState } from 'react';
import { saveVerificationDetails, type VerificationResult } from './verification-actions';

const initialState: VerificationResult = { error: null };

export function VerificationForm({
  existing,
}: {
  existing: {
    fullName: string | null;
    contactNumber: string | null;
    businessPermitReference: string | null;
    governmentRegistrationReference: string | null;
    hasDocument: boolean;
  } | null;
}) {
  const [state, formAction, isPending] = useActionState(
    saveVerificationDetails,
    initialState,
  );

  return (
    <form action={formAction} className="card space-y-4">
      <p className="text-xs text-foreground-secondary">
        Optional, but speeds up verification. These details and any document you upload
        are private — visible only to you and Masahe Pinas moderators, never shown on your
        public listing.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="text-sm text-foreground-secondary">
            Your full name
          </label>
          <input
            id="fullName"
            name="fullName"
            defaultValue={existing?.fullName ?? ''}
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="contactNumber" className="text-sm text-foreground-secondary">
            Contact number
          </label>
          <input
            id="contactNumber"
            name="contactNumber"
            defaultValue={existing?.contactNumber ?? ''}
            placeholder="09XXXXXXXXX"
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="businessPermitReference"
            className="text-sm text-foreground-secondary"
          >
            Business permit reference
          </label>
          <input
            id="businessPermitReference"
            name="businessPermitReference"
            defaultValue={existing?.businessPermitReference ?? ''}
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="governmentRegistrationReference"
            className="text-sm text-foreground-secondary"
          >
            Government registration reference
          </label>
          <input
            id="governmentRegistrationReference"
            name="governmentRegistrationReference"
            defaultValue={existing?.governmentRegistrationReference ?? ''}
            className="input-field"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="document" className="text-sm text-foreground-secondary">
          Supporting document (permit or registration copy — JPEG, PNG, or PDF)
        </label>
        <input
          id="document"
          name="document"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="input-field"
        />
        {existing?.hasDocument ? (
          <p className="text-xs text-brand-accent">
            A document is already on file. Uploading a new one replaces it.
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-brand-accent">Saved.</p> : null}

      <button type="submit" className="btn-secondary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save verification details'}
      </button>
    </form>
  );
}
