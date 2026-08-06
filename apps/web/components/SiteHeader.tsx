import Link from 'next/link';
import { APP_NAME } from '@masahepinas/config';
import { getServerAuthSession } from '@/lib/auth';
import { signOut } from '@/app/(auth)/actions';

/** Minimal, role-agnostic top nav so the pages built across Phases 1-4 are
 * actually reachable from one another. A richer role-aware nav (owner/
 * moderator/superadmin sections) is a Phase 5+ polish item once those
 * dashboards exist. */
export async function SiteHeader() {
  const session = await getServerAuthSession();

  return (
    <header className="border-b border-white/5 bg-background-secondary">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-sm font-semibold text-foreground">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-4 text-sm text-foreground-secondary">
          <Link href="/search" className="hover:text-foreground">
            Search
          </Link>
          <Link href="/map" className="hover:text-foreground">
            Map
          </Link>
          {session ? (
            <>
              <Link href="/saved" className="hover:text-foreground">
                Saved
              </Link>
              <Link href="/notifications" className="hover:text-foreground">
                Notifications
              </Link>
              <Link href={`/u/${session.userId}`} className="hover:text-foreground">
                {session.profile?.displayName ?? 'Profile'}
              </Link>
              <form action={signOut}>
                <button type="submit" className="hover:text-foreground">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="hover:text-foreground">
                Sign in
              </Link>
              <Link href="/sign-up" className="hover:text-foreground">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
