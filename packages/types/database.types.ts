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

import type {
  AccountStatus,
  AppRole,
  GenderAvailability,
  ListingStatus,
  ModerationActionType,
  PriceRange,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  ReviewModerationStatus,
} from './enums';

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
      service_categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['service_categories']['Insert']>;
        Relationships: [];
      };
      spa_businesses: {
        Row: {
          id: string;
          slug: string;
          owner_id: string | null;
          business_name: string;
          description: string | null;
          logo_image_id: string | null;
          status: ListingStatus;
          is_premium: boolean;
          is_recommended: boolean;
          recommended_by: string | null;
          recommended_at: string | null;
          contact_number: string | null;
          booking_contact_number: string | null;
          website_url: string | null;
          social_media_url: string | null;
          price_range: PriceRange | null;
          gender_availability: GenderAvailability;
          average_rating: number;
          review_count: number;
          verified_review_count: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          owner_id?: string | null;
          business_name: string;
          description?: string | null;
          contact_number?: string | null;
          booking_contact_number?: string | null;
          website_url?: string | null;
          social_media_url?: string | null;
          price_range?: PriceRange | null;
          gender_availability?: GenderAvailability;
          status?: ListingStatus;
        };
        Update: Partial<Database['public']['Tables']['spa_businesses']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'spa_businesses_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      business_locations: {
        Row: {
          id: string;
          business_id: string;
          address_line: string;
          barangay: string | null;
          city_municipality: string;
          province: string;
          region: string;
          postal_code: string | null;
          latitude: number;
          longitude: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          address_line: string;
          barangay?: string | null;
          city_municipality: string;
          province: string;
          region: string;
          postal_code?: string | null;
          latitude: number;
          longitude: number;
        };
        Update: Partial<Database['public']['Tables']['business_locations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'business_locations_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: true;
            referencedRelation: 'spa_businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      business_hours: {
        Row: {
          id: string;
          business_id: string;
          day_of_week: number;
          open_time: string | null;
          close_time: string | null;
          is_closed: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          day_of_week: number;
          open_time?: string | null;
          close_time?: string | null;
          is_closed?: boolean;
        };
        Update: Partial<Database['public']['Tables']['business_hours']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'business_hours_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'spa_businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      business_services: {
        Row: {
          id: string;
          business_id: string;
          service_category_id: string;
          is_featured: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_category_id: string;
          is_featured?: boolean;
        };
        Update: Partial<Database['public']['Tables']['business_services']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'business_services_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'spa_businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'business_services_service_category_id_fkey';
            columns: ['service_category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      business_images: {
        Row: {
          id: string;
          business_id: string;
          storage_path: string;
          caption: string | null;
          alt_text: string | null;
          is_primary: boolean;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          storage_path: string;
          caption?: string | null;
          alt_text?: string | null;
          is_primary?: boolean;
          position?: number;
        };
        Update: Partial<Database['public']['Tables']['business_images']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'business_images_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'spa_businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      saved_businesses: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id: string;
        };
        Update: Partial<Database['public']['Tables']['saved_businesses']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'saved_businesses_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'spa_businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          overall_rating: number;
          body: string;
          service_date: string | null;
          service_category_id: string | null;
          is_verified_visit: boolean;
          helpful_count: number;
          moderation_status: ReviewModerationStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          overall_rating: number;
          body: string;
          service_date?: string | null;
          service_category_id?: string | null;
          is_verified_visit?: boolean;
          moderation_status?: ReviewModerationStatus;
        };
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'reviews_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'spa_businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      review_ratings: {
        Row: {
          id: string;
          review_id: string;
          category: string;
          rating: number;
        };
        Insert: {
          id?: string;
          review_id: string;
          category: string;
          rating: number;
        };
        Update: Partial<Database['public']['Tables']['review_ratings']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'review_ratings_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
        ];
      };
      review_replies: {
        Row: {
          id: string;
          review_id: string;
          business_id: string;
          replied_by: string;
          body: string;
          created_at: string;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          review_id: string;
          business_id: string;
          replied_by: string;
          body: string;
        };
        Update: Partial<Database['public']['Tables']['review_replies']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'review_replies_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: true;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
        ];
      };
      review_edits: {
        Row: {
          id: string;
          review_id: string;
          previous_body: string;
          previous_rating: number;
          edited_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          previous_body: string;
          previous_rating: number;
        };
        Update: Partial<Database['public']['Tables']['review_edits']['Insert']>;
        Relationships: [];
      };
      review_helpful_votes: {
        Row: {
          id: string;
          review_id: string;
          voter_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          voter_id: string;
        };
        Update: Partial<Database['public']['Tables']['review_helpful_votes']['Insert']>;
        Relationships: [];
      };
      content_reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: ReportReason;
          details: string | null;
          status: ReportStatus;
          assigned_moderator_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: ReportReason;
          details?: string | null;
          status?: ReportStatus;
        };
        Update: Partial<Database['public']['Tables']['content_reports']['Insert']>;
        Relationships: [];
      };
      moderation_actions: {
        Row: {
          id: string;
          moderator_id: string;
          action_type: ModerationActionType;
          target_type: string;
          target_id: string;
          reason: string;
          notes: string | null;
          previous_state: unknown;
          new_state: unknown;
          report_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          moderator_id: string;
          action_type: ModerationActionType;
          target_type: string;
          target_id: string;
          reason: string;
          notes?: string | null;
          report_id?: string | null;
          previous_state?: unknown;
          new_state?: unknown;
        };
        Update: Partial<Database['public']['Tables']['moderation_actions']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link_url: string | null;
          is_read: boolean;
          metadata: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          link_url?: string | null;
          is_read?: boolean;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
      user_follows: {
        Row: {
          id: string;
          follower_id: string;
          followee_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          followee_id: string;
        };
        Update: Partial<Database['public']['Tables']['user_follows']['Insert']>;
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          tier: number | null;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          tier?: number | null;
          icon?: string | null;
        };
        Update: Partial<Database['public']['Tables']['badges']['Insert']>;
        Relationships: [];
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          awarded_at: string;
          awarded_reason: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          awarded_reason?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_badges']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'user_badges_badge_id_fkey';
            columns: ['badge_id'];
            isOneToOne: false;
            referencedRelation: 'badges';
            referencedColumns: ['id'];
          },
        ];
      };
      user_credibility_scores: {
        Row: {
          user_id: string;
          score: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          score?: number;
        };
        Update: Partial<
          Database['public']['Tables']['user_credibility_scores']['Insert']
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_spa_businesses: {
        Args: {
          search_query?: string | null;
          filter_region?: string | null;
          filter_province?: string | null;
          filter_city?: string | null;
          filter_service_slug?: string | null;
          filter_gender?: GenderAvailability | null;
          filter_price?: PriceRange | null;
          filter_verified_only?: boolean;
          filter_premium_only?: boolean;
          filter_recommended_only?: boolean;
          filter_min_rating?: number | null;
          user_lat?: number | null;
          user_lng?: number | null;
          radius_km?: number | null;
          sort_by?: string;
          page_number?: number;
          page_size?: number;
        };
        Returns: {
          id: string;
          slug: string;
          business_name: string;
          description: string | null;
          status: ListingStatus;
          is_premium: boolean;
          is_recommended: boolean;
          gender_availability: GenderAvailability;
          price_range: PriceRange | null;
          average_rating: number;
          review_count: number;
          city_municipality: string;
          province: string;
          region: string;
          latitude: number;
          longitude: number;
          primary_image_path: string | null;
          distance_km: number | null;
          total_count: number;
        }[];
      };
    };
    Enums: {
      app_role: AppRole;
      account_status: AccountStatus;
      listing_status: ListingStatus;
      gender_availability: GenderAvailability;
      price_range: PriceRange;
      review_moderation_status: ReviewModerationStatus;
      report_status: ReportStatus;
      report_target_type: ReportTargetType;
      report_reason: ReportReason;
      moderation_action_type: ModerationActionType;
    };
    CompositeTypes: Record<string, never>;
  };
}
