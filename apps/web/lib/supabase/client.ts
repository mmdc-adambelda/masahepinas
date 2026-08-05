'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@masahepinas/types';

/**
 * Browser client for Client Components. Only ever holds the public anon
 * key. All privileged/sensitive mutations still go through RLS-checked
 * queries or a Server Action/Route Handler that re-validates permissions.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
