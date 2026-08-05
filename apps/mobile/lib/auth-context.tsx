import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppRole, AuthSession, Profile } from '@masahepinas/types';
import { supabase } from './supabase';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  refresh: async () => {},
});

async function loadSession(): Promise<AuthSession | null> {
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

  return { userId: user.id, email: user.email, profile, roles };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const next = await loadSession();
    setSession(next);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
