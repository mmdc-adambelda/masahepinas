import { redirect } from 'next/navigation';
import type { AppRole, AuthSession, Profile } from '@masahepinas/types';
import { hasRole, isStaff } from '@masahepinas/types';
import { createSupabaseServerClient } from './supabase/server';

/**
 * Server-side session lookup: composes the authenticated user with their
 * `profiles` row and `user_roles`. This is the only place role information
 * should be read from for authorization decisions — never trust a role
 * claimed by the client (see docs/permissions.md).
 */
export async function getServerAuthSession(): Promise<AuthSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);

  const profile: Profile | null = profileRow
    ? {
        id: profileRow.id,
        displayName: profileRow.display_name,
        avatarUrl: profileRow.avatar_url,
        bio: profileRow.bio,
        city: profileRow.city,
        province: profileRow.province,
        isPrivate: profileRow.is_private,
        status: profileRow.status,
        createdAt: profileRow.created_at,
      }
    : null;

  const roles: AppRole[] = (roleRows ?? []).map((row) => row.role);

  return {
    userId: user.id,
    email: user.email,
    profile,
    roles,
  };
}

/**
 * Server Component / Server Action guard: redirects unauthenticated users
 * to sign-in, and users lacking `role` to the homepage. Never rely on this
 * alone for data access — RLS is still the real boundary (see
 * docs/permissions.md); this only controls page-level UX.
 */
export async function requireRole(role: AppRole): Promise<AuthSession> {
  const session = await getServerAuthSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent('/')}`);
  if (!hasRole(session, role) && !isStaff(session)) redirect('/');
  return session;
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getServerAuthSession();
  if (!session) redirect('/sign-in');
  return session;
}

/**
 * Strict superadmin-only guard — unlike `requireRole`, moderators do NOT
 * pass this check. Use for capabilities the permission matrix reserves for
 * superadmin alone (e.g. manually creating a listing) — see
 * docs/permissions.md §2.
 */
export async function requireSuperadmin(): Promise<AuthSession> {
  const session = await getServerAuthSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent('/')}`);
  if (!hasRole(session, 'superadmin')) redirect('/');
  return session;
}
