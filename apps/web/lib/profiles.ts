// Server-only data access (see apps/web/lib/spa-businesses.ts convention note).
import type { Badge, ProfileStats, PublicProfile } from '@masahepinas/types';
import { createSupabaseServerClient } from './supabase/server';

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    city: data.city,
    province: data.province,
    isPrivate: data.is_private,
    createdAt: data.created_at,
  };
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = await createSupabaseServerClient();

  const [
    { count: reviewCount },
    { count: verifiedReviewCount },
    { data: reviewRows },
    { count: followerCount },
    { count: followingCount },
  ] = await Promise.all([
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', userId)
      .eq('moderation_status', 'visible'),
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', userId)
      .eq('moderation_status', 'visible')
      .eq('is_verified_visit', true),
    supabase
      .from('reviews')
      .select(
        'helpful_count, business_id, spa_businesses(business_locations(city_municipality))',
      )
      .eq('customer_id', userId)
      .eq('moderation_status', 'visible'),
    supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('followee_id', userId),
    supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ]);

  const helpfulVotesReceived = (reviewRows ?? []).reduce(
    (sum, r) => sum + (r.helpful_count ?? 0),
    0,
  );
  interface ReviewRowWithCity {
    helpful_count: number | null;
    spa_businesses: { business_locations: { city_municipality: string } | null } | null;
  }
  const cities = new Set(
    ((reviewRows ?? []) as ReviewRowWithCity[])
      .map((r) => r.spa_businesses?.business_locations?.city_municipality)
      .filter(Boolean),
  );

  return {
    reviewCount: reviewCount ?? 0,
    verifiedReviewCount: verifiedReviewCount ?? 0,
    helpfulVotesReceived,
    citiesReviewed: cities.size,
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

export async function getUserBadges(
  userId: string,
): Promise<(Badge & { awardedAt: string })[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('user_badges')
    .select('awarded_at, badges(id, slug, name, description, tier, icon)')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).flatMap((row: any) =>
    row.badges
      ? [
          {
            id: row.badges.id,
            slug: row.badges.slug,
            name: row.badges.name,
            description: row.badges.description,
            tier: row.badges.tier,
            icon: row.badges.icon,
            awardedAt: row.awarded_at,
          },
        ]
      : [],
  );
}

export async function isFollowing(
  followerId: string,
  followeeId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId)
    .maybeSingle();
  return Boolean(data);
}

export interface FollowListItem {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export async function listFollowers(userId: string): Promise<FollowListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('user_follows')
    .select('profiles!user_follows_follower_id_fkey(id, display_name, avatar_url)')
    .eq('followee_id', userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).flatMap((row: any) =>
    row.profiles
      ? [
          {
            id: row.profiles.id,
            displayName: row.profiles.display_name,
            avatarUrl: row.profiles.avatar_url,
          },
        ]
      : [],
  );
}

export async function listFollowing(userId: string): Promise<FollowListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('user_follows')
    .select('profiles!user_follows_followee_id_fkey(id, display_name, avatar_url)')
    .eq('follower_id', userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).flatMap((row: any) =>
    row.profiles
      ? [
          {
            id: row.profiles.id,
            displayName: row.profiles.display_name,
            avatarUrl: row.profiles.avatar_url,
          },
        ]
      : [],
  );
}

export interface ProfileReviewItem {
  id: string;
  businessName: string;
  businessSlug: string;
  overallRating: number;
  body: string;
  createdAt: string;
}

export async function listPublicReviews(userId: string): Promise<ProfileReviewItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reviews')
    .select('id, overall_rating, body, created_at, spa_businesses(business_name, slug)')
    .eq('customer_id', userId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(20);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).flatMap((row: any) =>
    row.spa_businesses
      ? [
          {
            id: row.id,
            businessName: row.spa_businesses.business_name,
            businessSlug: row.spa_businesses.slug,
            overallRating: row.overall_rating,
            body: row.body,
            createdAt: row.created_at,
          },
        ]
      : [],
  );
}
