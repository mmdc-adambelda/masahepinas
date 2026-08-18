import type { MetadataRoute } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const STATIC_ROUTES = [
  '',
  '/search',
  '/about',
  '/blogs',
  '/blogs/cavite-spa',
  '/premium',
  '/terms',
  '/privacy',
  '/sign-up',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createSupabaseServerClient();

  // Only publicly-discoverable listings belong in the sitemap — RLS
  // already scopes this select to non-deleted verified/unverified/
  // pending_review businesses for an unauthenticated caller (see
  // spa_businesses_select in supabase/migrations/0003_spa_directory.sql),
  // so no extra status filter is needed here.
  const [{ data: listings }, { data: posts }] = await Promise.all([
    supabase
      .from('spa_businesses')
      .select('slug, updated_at')
      .eq('status', 'verified')
      .order('updated_at', { ascending: false })
      .limit(5000),
    // RLS already scopes this to published posts for an unauthenticated
    // caller (see blog_posts_select in supabase/migrations/0019_blog_posts.sql).
    supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(2000),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.6,
  }));

  const listingEntries: MetadataRoute.Sitemap = (listings ?? []).map((listing) => ({
    url: `${siteUrl}/spa/${listing.slug}`,
    lastModified: listing.updated_at ?? undefined,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${siteUrl}/blogs/${post.slug}`,
    lastModified: post.updated_at ?? undefined,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticEntries, ...listingEntries, ...blogEntries];
}
