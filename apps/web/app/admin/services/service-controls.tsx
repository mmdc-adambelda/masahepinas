'use client';

import { useActionState, useTransition } from 'react';
import {
  createServiceCategory,
  toggleServiceCategoryActive,
  type ServiceCategoryResult,
} from './actions';

const initialState: ServiceCategoryResult = { error: null };

export function CreateServiceForm() {
  const [state, formAction, isPending] = useActionState(
    createServiceCategory,
    initialState,
  );

  return (
    <form action={formAction} className="card space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm text-foreground-secondary">
            Service name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Hilot"
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm text-foreground-secondary">
            Description
          </label>
          <input id="description" name="description" className="input-field" />
        </div>
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add service'}
      </button>
    </form>
  );
}

export function ToggleActiveButton({
  categoryId,
  isActive,
}: {
  categoryId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="text-xs text-foreground-secondary hover:text-foreground"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleServiceCategoryActive(categoryId, !isActive);
        })
      }
    >
      {isPending ? 'Working…' : isActive ? 'Deactivate' : 'Activate'}
    </button>
  );
}
