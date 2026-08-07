import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@masahepinas/types';

type CookieToSet = { name: string; value: string; options?: CookieOptionsWithName };

// Routes a pending-approval user may still reach. Everything else
// redirects to /pending-approval (see the registration-approval feature
// note in supabase/migrations/0013_registration_approval.sql). Prefix
// matches, not exact — e.g. '/auth' covers '/auth/callback'.
const PENDING_APPROVAL_ALLOWLIST = ['/pending-approval', '/auth'];

/**
 * Refreshes the Supabase auth session cookie on every request so server
 * components always see an up-to-date session. Called from apps/web/middleware.ts.
 * Also enforces the registration-approval gate: a signed-in user whose
 * profile is still 'pending_approval' is redirected to /pending-approval
 * no matter what page they requested.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Required so expired sessions are refreshed before Server Components read them.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const pathIsAllowlisted = PENDING_APPROVAL_ALLOWLIST.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
  );

  if (user && !pathIsAllowlisted) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.status === 'pending_approval') {
      const redirectResponse = NextResponse.redirect(
        new URL('/pending-approval', request.url),
      );
      // Carry over any refreshed session cookies onto the redirect so the
      // user doesn't get logged out by redirecting them.
      for (const cookie of response.cookies.getAll()) {
        redirectResponse.cookies.set(cookie);
      }
      return redirectResponse;
    }
  }

  return response;
}
