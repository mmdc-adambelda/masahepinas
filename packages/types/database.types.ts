/**
 * Hand-written Supabase database types for the tables that exist as of
 * Phase 1 (project foundation). Once the project is linked to a real
 * Supabase instance, regenerate/extend this file with:
 *
 *   supabase gen types typescript --local > packages/types/database.types.ts
 *
 * Do this after every migration so `Database` stays in sync with
 * docs/database-schema.md. Phase 2+ migrations must add their tables here.
 *
 * NOTE: every table needs a `Relationships` array (even if empty) — the
 * installed @supabase/postgrest-js query-builder types require it to
 * correctly infer `.select()` result types; omitting it silently widens
 * query results to `never`.
 */

import type { AccountStatus, AppRole } from './enums';

export interface Database {
  // Required by newer @supabase/ssr and @supabase/supabase-js versions to
  // correctly resolve the default schema's table/view/function types.
  __InternalSupabase: {
    PostgrestVersion: '13';
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          province: string | null;
          is_private: boolean;
          status: AccountStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          province?: string | null;
          is_private?: boolean;
          status?: AccountStatus;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: AppRole;
          granted_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      account_status: AccountStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
