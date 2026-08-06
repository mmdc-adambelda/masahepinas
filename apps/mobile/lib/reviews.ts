import { supabase } from './supabase';

export interface ReviewItem {
  id: string;
  customerId: string;
  customerDisplayName: string;
  overallRating: number;
  body: string;
  helpfulCount: number;
  moderationStatus: string;
  createdAt: string;
  replyBody: string | null;
}

export async function getReviewsForBusiness(businessId: string): Promise<ReviewItem[]> {
  const { data } = await supabase
    .from('reviews')
    .select(
      'id, customer_id, overall_rating, body, helpful_count, moderation_status, created_at, profiles(display_name), review_replies(body)',
    )
    .eq('business_id', businessId)
    .eq('moderation_status', 'visible')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    customerDisplayName: row.profiles?.display_name ?? 'Masahe Pinas member',
    overallRating: row.overall_rating,
    body: row.body,
    helpfulCount: row.helpful_count,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at,
    replyBody: row.review_replies?.[0]?.body ?? null,
  }));
}

export async function getMyReview(
  businessId: string,
  customerId: string,
): Promise<{ id: string; overallRating: number; body: string } | null> {
  const { data } = await supabase
    .from('reviews')
    .select('id, overall_rating, body')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, overallRating: data.overall_rating, body: data.body };
}

export async function submitReview(
  businessId: string,
  customerId: string,
  overallRating: number,
  body: string,
  existingId: string | null,
): Promise<{ error: string | null }> {
  if (existingId) {
    const { error } = await supabase
      .from('reviews')
      .update({ overall_rating: overallRating, body })
      .eq('id', existingId);
    return { error: error ? 'Could not update your review.' : null };
  }
  const { error } = await supabase.from('reviews').insert({
    business_id: businessId,
    customer_id: customerId,
    overall_rating: overallRating,
    body,
  });
  return {
    error: error
      ? 'Could not submit your review. You may already have one, or this may be your own business.'
      : null,
  };
}

export async function toggleHelpfulVote(
  reviewId: string,
  userId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('review_helpful_votes')
    .select('id')
    .eq('review_id', reviewId)
    .eq('voter_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('review_helpful_votes').delete().eq('id', existing.id);
    return false;
  }
  await supabase
    .from('review_helpful_votes')
    .insert({ review_id: reviewId, voter_id: userId });
  return true;
}
