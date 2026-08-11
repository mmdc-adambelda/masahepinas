'use client';

import { useActionState } from 'react';
import { addFeaturedPlacement, type FeaturedResult } from './actions';

const initialState: FeaturedResult = { error: null };

export function AddFeaturedForm() {
  const [state, formAction, isPending] = useActionState(
    addFeaturedPlacement,
    initialState,
  );

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="font-medium text-foreground">Add a featured placement</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm text-foreground-secondary">
            Listing slug
          </label>
          <input
            id="slug"
            name="slug"
            required
            placeholder="serenity-leaf-spa-makati"
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="placementKey" className="text-sm text-foreground-secondary">
            Placement key
          </label>
          <input
            id="placementKey"
            name="placementKey"
            required
            placeholder="homepage_highly_rated"
            className="input-field"
          />
        </div>
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add placement'}
      </button>
    </form>
  );
}
