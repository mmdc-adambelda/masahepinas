import { supabase } from './supabase';

export interface ProfileSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  province: string | null;
}

export interface ProfileStats {
  reviewCount: number;
  helpfulVotesReceived: number;
  followerCount: number;
  followingCount: number;
}

export interface BadgeSummary {
  id: string;
  name: string;
  description: string | null;
}

export async function getProfile(userId: string): Promise<ProfileSummary | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, city, province')
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
  };
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [
    { count: reviewCount },
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
      .select('helpful_count')
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

  return {
    reviewCount: reviewCount ?? 0,
    helpfulVotesReceived: (reviewRows ?? []).reduce(
      (sum, r) => sum + (r.helpful_count ?? 0),
      0,
    ),
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

export async function getBadges(userId: string): Promise<BadgeSummary[]> {
  const { data } = await supabase
    .from('user_badges')
    .select('badges(id, name, description)')
    .eq('user_id', userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).flatMap((row: any) =>
    row.badges
      ? [
          {
            id: row.badges.id,
            name: row.badges.name,
            description: row.badges.description,
          },
        ]
      : [],
  );
}

export async function isFollowing(
  followerId: string,
  followeeId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleFollow(
  followerId: string,
  followeeId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId)
    .maybeSingle();

  if (existing) {
    await supabase.from('user_follows').delete().eq('id', existing.id);
    return false;
  }
  await supabase
    .from('user_follows')
    .insert({ follower_id: followerId, followee_id: followeeId });
  return true;
}
