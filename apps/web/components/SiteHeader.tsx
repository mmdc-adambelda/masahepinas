import Image from 'next/image';
import Link from 'next/link';
import { APP_NAME } from '@masahepinas/config';
import { hasRole, isStaff } from '@masahepinas/types';
import { getServerAuthSession } from '@/lib/auth';
import { signOut } from '@/app/(auth)/actions';

/** Minimal, role-aware top nav so the pages built across Phases 1-5 are
 * actually reachable from one another. */
export async function SiteHeader() {
  const session = await getServerAuthSession();

  return (
    <header className="border-b border-white/5 bg-background-secondary">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo-banner-green-bg.png"
            alt={APP_NAME}
            width={1408}
            height={768}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-foreground-secondary">
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
              {hasRole(session, 'spa_owner') ? (
                <Link href="/owner/dashboard" className="hover:text-foreground">
                  Owner dashboard
                </Link>
              ) : null}
              {isStaff(session) ? (
                <Link href="/admin" className="hover:text-foreground">
                  Admin
                </Link>
              ) : null}
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
