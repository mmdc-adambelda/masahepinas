import type { AccountStatus, AppRole } from './enums';

/** App-level shape of a signed-in user, composed from profiles + user_roles. */
export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  province: string | null;
  isPrivate: boolean;
  status: AccountStatus;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  profile: Profile | null;
  roles: AppRole[];
}

/** Convenience helpers kept close to the type so web/mobile stay in sync. */
export function hasRole(session: AuthSession | null, role: AppRole): boolean {
  return session?.roles.includes(role) ?? false;
}

export function isStaff(session: AuthSession | null): boolean {
  return hasRole(session, 'moderator') || hasRole(session, 'superadmin');
}
