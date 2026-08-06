'use client';

import type { AnchorHTMLAttributes } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface TrackedLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  eventType: string;
  businessId: string;
}

/** Fires a fire-and-forget analytics event on click, then lets the
 * anchor's normal navigation proceed — never blocks or awaits. Used for
 * "Call" / "Get directions" buttons so owner dashboards have real click
 * data (docs/product-requirements.md §26 Analytics Events). */
export function TrackedLink({
  eventType,
  businessId,
  onClick,
  ...anchorProps
}: TrackedLinkProps) {
  return (
    <a
      {...anchorProps}
      onClick={(event) => {
        const supabase = createSupabaseBrowserClient();
        supabase.auth.getUser().then(({ data }) => {
          void supabase
            .from('analytics_events')
            .insert({
              event_type: eventType,
              business_id: businessId,
              user_id: data.user?.id ?? null,
            });
        });
        onClick?.(event);
      }}
    />
  );
}
