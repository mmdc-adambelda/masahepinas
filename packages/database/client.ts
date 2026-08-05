import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@masahepinas/types';

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Platform-agnostic client factory. Each app supplies its own env values
 * and (on the web) its own cookie-aware server client built on top of
 * @supabase/ssr — see apps/web/lib/supabase for that wiring.
 *
 * IMPORTANT: `anonKey` must always be the public anon key. The service-role
 * key must never be passed into a client that ships to a browser or mobile
 * bundle (see docs/security-checklist.md).
 */
export interface AsyncStorageLike {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: { storage?: AsyncStorageLike },
): TypedSupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase URL and anon key are required. Check your environment variables against .env.example.',
    );
  }
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      ...(options?.storage ? { storage: options.storage } : {}),
    },
  });
}

/**
 * Server-only factory for privileged operations (Edge Functions, trusted
 * server processes). Never import this from anything that runs in a
 * browser or mobile client bundle.
 */
export function createServiceRoleClient(
  url: string,
  serviceRoleKey: string,
): TypedSupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase URL and service role key are required for privileged access.',
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
