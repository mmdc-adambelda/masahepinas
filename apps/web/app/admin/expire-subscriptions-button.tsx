'use client';

import { useState, useTransition } from 'react';
import { runExpirationSweep } from './actions';

/** Manual trigger for the subscription-expiration sweep, standing in for
 * a scheduled job (pg_cron may not be enabled on every Supabase plan —
 * see supabase/migrations/0009_premium_subscription.sql). Idempotent: a
 * subscription already past its period end only gets flagged once. */
export function ExpireSubscriptionsButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="btn-secondary text-xs"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await runExpirationSweep();
            setMessage(result.error ?? `Expired ${result.count ?? 0} subscription(s).`);
          })
        }
      >
        {isPending ? 'Running…' : 'Run expiration sweep'}
      </button>
      {message ? <p className="text-xs text-foreground-secondary">{message}</p> : null}
    </div>
  );
}
