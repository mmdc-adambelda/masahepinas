import type { OwnerDashboardStats } from '@masahepinas/types';
import { createSupabaseServerClient } from './supabase/server';

/** Best-effort server-side event log — never throws, since analytics must
 * never block or break the page that triggered it. */
export async function recordEvent(
  eventType: string,
  businessId: string | null,
  userId: string | null,
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase
      .from('analytics_events')
      .insert({ event_type: eventType, business_id: businessId, user_id: userId });
  } catch {
    // Analytics failures are never surfaced to the user.
  }
}

export async function getOwnerDashboardStats(
  businessId: string,
): Promise<OwnerDashboardStats> {
  const supabase = await createSupabaseServerClient();

  const [
    { data: business },
    { count: savedCount },
    { count: profileViews },
    { count: contactClicks },
    { count: directionClicks },
    { count: reviewCount },
    { count: repliedCount },
  ] = await Promise.all([
    supabase
      .from('spa_businesses')
      .select('status, average_rating, review_count')
      .eq('id', businessId)
      .maybeSingle(),
    supabase
      .from('saved_businesses')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId),
    supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('event_type', 'listing_view'),
    supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('event_type', 'contact_click'),
    supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('event_type', 'directions_click'),
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('moderation_status', 'visible'),
    supabase
      .from('review_replies')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId),
  ]);

  const totalReviews = reviewCount ?? 0;
  const responseRate =
    totalReviews > 0 ? Math.min(1, (repliedCount ?? 0) / totalReviews) : 0;

  return {
    status: business?.status ?? 'pending_review',
    averageRating: Number(business?.average_rating ?? 0),
    reviewCount: totalReviews,
    savedCount: savedCount ?? 0,
    profileViews: profileViews ?? 0,
    contactClicks: contactClicks ?? 0,
    directionClicks: directionClicks ?? 0,
    responseRate,
  };
}
