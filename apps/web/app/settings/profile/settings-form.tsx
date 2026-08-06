'use client';

import { useActionState } from 'react';
import type { PublicProfile } from '@masahepinas/types';
import { updateProfileSettings, type SettingsResult } from './actions';

const initialState: SettingsResult = { error: null };

export function SettingsForm({ profile }: { profile: PublicProfile }) {
  const [state, formAction, isPending] = useActionState(
    updateProfileSettings,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="displayName" className="text-sm text-foreground-secondary">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          minLength={2}
          defaultValue={profile.displayName}
          className="input-field"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bio" className="text-sm text-foreground-secondary">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={profile.bio ?? ''}
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="city" className="text-sm text-foreground-secondary">
            City
          </label>
          <input
            id="city"
            name="city"
            defaultValue={profile.city ?? ''}
            className="input-field"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="province" className="text-sm text-foreground-secondary">
            Province
          </label>
          <input
            id="province"
            name="province"
            defaultValue={profile.province ?? ''}
            className="input-field"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground-secondary">
        <input type="checkbox" name="isPrivate" defaultChecked={profile.isPrivate} />
        Keep my review history private
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-brand-accent">Saved.</p> : null}

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
