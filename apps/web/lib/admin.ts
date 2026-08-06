// Server-only data access for the superadmin/moderator dashboard (see
// apps/web/lib/spa-businesses.ts convention note).
import type { ListingStatus } from '@masahepinas/types';
import { createSupabaseServerClient } from './supabase/server';

export interface PlatformStats {
  totalCustomers: number;
  totalSpaOwners: number;
  totalListings: number;
  verifiedListings: number;
  pendingListings: number;
  openReports: number;
  pendingClaims: number;
  reviewCount: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createSupabaseServerClient();

  const [
    { count: totalCustomers },
    { count: totalSpaOwners },
    { count: totalListings },
    { count: verifiedListings },
    { count: pendingListings },
    { count: openReports },
    { count: pendingClaims },
    { count: reviewCount },
  ] = await Promise.all([
    supabase
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'customer'),
    supabase
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'spa_owner'),
    supabase
      .from('spa_businesses')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('spa_businesses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'verified'),
    supabase
      .from('spa_businesses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review'),
    supabase
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('business_claims')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'visible'),
  ]);

  return {
    totalCustomers: totalCustomers ?? 0,
    totalSpaOwners: totalSpaOwners ?? 0,
    totalListings: totalListings ?? 0,
    verifiedListings: verifiedListings ?? 0,
    pendingListings: pendingListings ?? 0,
    openReports: openReports ?? 0,
    pendingClaims: pendingClaims ?? 0,
    reviewCount: reviewCount ?? 0,
  };
}

export interface AdminUserRow {
  id: string;
  displayName: string;
  city: string | null;
  province: string | null;
  status: string;
  roles: string[];
  createdAt: string;
}

export async function searchUsers(query: string): Promise<AdminUserRow[]> {
  const supabase = await createSupabaseServerClient();
  let builder = supabase
    .from('profiles')
    .select('id, display_name, city, province, status, created_at, user_roles(role)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (query.trim()) {
    builder = builder.ilike('display_name', `%${query.trim()}%`);
  }

  const { data } = await builder;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    displayName: row.display_name,
    city: row.city,
    province: row.province,
    status: row.status,
    roles: (row.user_roles ?? []).map((r: { role: string }) => r.role),
    createdAt: row.created_at,
  }));
}

export interface AdminListingRow {
  id: string;
  slug: string;
  businessName: string;
  status: string;
  ownerId: string | null;
  createdAt: string;
}

export async function listListingsByStatus(
  status: ListingStatus | 'all',
): Promise<AdminListingRow[]> {
  const supabase = await createSupabaseServerClient();
  const query = supabase
    .from('spa_businesses')
    .select('id, slug, business_name, status, owner_id, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  const { data } = status === 'all' ? await query : await query.eq('status', status);

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    businessName: row.business_name,
    status: row.status,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  }));
}

export interface AdminClaimRow {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  claimantUserId: string;
  claimantDisplayName: string;
  notes: string | null;
  createdAt: string;
}

export async function listPendingClaims(): Promise<AdminClaimRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('business_claims')
    .select(
      'id, business_id, claimant_user_id, notes, created_at, spa_businesses(business_name, slug), profiles(display_name)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    businessId: row.business_id,
    businessName: row.spa_businesses?.business_name ?? 'Unknown business',
    businessSlug: row.spa_businesses?.slug ?? '',
    claimantUserId: row.claimant_user_id,
    claimantDisplayName: row.profiles?.display_name ?? 'Unknown user',
    notes: row.notes,
    createdAt: row.created_at,
  }));
}
