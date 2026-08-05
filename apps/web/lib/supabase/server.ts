import { cookies } from 'next/headers';
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import type { Database } from '@masahepinas/types';

type CookieToSet = { name: string; value: string; options?: CookieOptionsWithName };

/**
 * Server Component / Server Action / Route Handler client. Uses the
 * anonymous key and the current user's session cookies — RLS still applies.
 * Never construct a service-role client here; that belongs only in trusted
 * server-only code paths (see docs/security-checklist.md).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component with no request context to
            // write to; safe to ignore because middleware refreshes the
            // session on every request.
          }
        },
      },
    },
  );
}
