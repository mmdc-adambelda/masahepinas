// Server-only data access — see apps/web/lib/spa-businesses.ts for the
// same convention note (relies on the request-scoped Supabase client).
import type { Review, ReviewCategory } from '@masahepinas/types';
import { createSupabaseServerClient } from './supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReviewRow(row: any): Review {
  const categoryRatings: Partial<Record<ReviewCategory, number>> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of row.review_ratings ?? []) {
    categoryRatings[r.category as ReviewCategory] = r.rating;
  }
  const reply =
    row.review_replies?.[0] ??
    (Array.isArray(row.review_replies) ? null : row.review_replies);

  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    customerDisplayName: row.profiles?.display_name ?? 'Masahe Pinas member',
    customerAvatarUrl: row.profiles?.avatar_url ?? null,
    overallRating: row.overall_rating,
    body: row.body,
    serviceDate: row.service_date,
    isVerifiedVisit: row.is_verified_visit,
    helpfulCount: row.helpful_count,
    moderationStatus: row.moderation_status,
    categoryRatings,
    reply: reply
      ? {
          id: reply.id,
          body: reply.body,
          createdAt: reply.created_at,
          editedAt: reply.edited_at,
        }
      : null,
    wasEdited: Boolean(row.review_edits?.length),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const REVIEW_SELECT = `
  id, business_id, customer_id, overall_rating, body, service_date, is_verified_visit,
  helpful_count, moderation_status, created_at, updated_at,
  profiles ( display_name, avatar_url ),
  review_ratings ( category, rating ),
  review_replies ( id, body, created_at, edited_at ),
  review_edits ( id )
`;

export async function getReviewsForBusiness(businessId: string): Promise<Review[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (data ?? []).map(mapReviewRow);
}

export async function getMyReviewForBusiness(
  businessId: string,
  customerId: string,
): Promise<Review | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .maybeSingle();

  return data ? mapReviewRow(data) : null;
}

export async function getMyHelpfulVotes(
  reviewIds: string[],
  userId: string,
): Promise<Set<string>> {
  if (reviewIds.length === 0) return new Set();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('review_helpful_votes')
    .select('review_id')
    .eq('voter_id', userId)
    .in('review_id', reviewIds);
  return new Set((data ?? []).map((row) => row.review_id));
}
