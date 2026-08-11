'use client';

import { useActionState, useTransition } from 'react';
import { createBadge, deleteBadge, type BadgeResult } from './actions';

const initialState: BadgeResult = { error: null };

export function CreateBadgeForm() {
  const [state, formAction, isPending] = useActionState(createBadge, initialState);

  return (
    <form action={formAction} className="card grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <label htmlFor="slug" className="text-sm text-foreground-secondary">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          required
          placeholder="community-contributor"
          className="input-field"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm text-foreground-secondary">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Community Contributor"
          className="input-field"
        />
      </div>
      <div className="col-span-2 space-y-1.5">
        <label htmlFor="description" className="text-sm text-foreground-secondary">
          Description
        </label>
        <input id="description" name="description" className="input-field" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="tier" className="text-sm text-foreground-secondary">
          Tier (optional, for leveled badges)
        </label>
        <input id="tier" name="tier" type="number" min={1} className="input-field" />
      </div>
      {state.error ? (
        <p className="col-span-2 text-sm text-danger">{state.error}</p>
      ) : null}
      <button type="submit" className="btn-primary col-span-2" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create badge'}
      </button>
    </form>
  );
}

export function DeleteBadgeButton({ badgeId }: { badgeId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="text-xs text-danger hover:underline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deleteBadge(badgeId);
        })
      }
    >
      {isPending ? 'Removing…' : 'Delete'}
    </button>
  );
}
