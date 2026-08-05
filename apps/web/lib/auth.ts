import type { AppRole, AuthSession, Profile } from '@masahepinas/types';
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
