// Server-only data access for the staff blog/article CMS (backs
// apps/web/app/admin/blogs/* and apps/web/app/blogs/*). Mirrors the
// pattern in lib/spa-businesses.ts.
import type { BlogPost, BlogPostSummary } from '@masahepinas/types';
import { createSupabaseServerClient } from './supabase/server';

const BLOG_IMAGE_PUBLIC_URL_PREFIX = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/`
  : '';

export function blogCoverImageUrl(storagePath: string): string {
  return `${BLOG_IMAGE_PUBLIC_URL_PREFIX}${storagePath}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    coverImageUrl: row.cover_image_path ? blogCoverImageUrl(row.cover_image_path) : null,
    coverImageAlt: row.cover_image_alt,
    isFeatured: row.is_featured,
    status: row.status,
    metaDescription: row.meta_description,
    authorId: row.author_id,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Published posts only, newest first — the public /blogs hub and
 * sitemap. `featuredOnly` narrows to posts flagged for the featured
 * section. */
export async function listPublishedBlogPosts(
  options: { featuredOnly?: boolean; limit?: number } = {},
): Promise<BlogPostSummary[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('blog_posts')
    .select(
      'id, slug, title, excerpt, cover_image_path, cover_image_alt, is_featured, status, meta_description, author_id, published_at, created_at, updated_at',
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (options.featuredOnly) query = query.eq('is_featured', true);
  if (options.limit) query = query.limit(options.limit);

  const { data } = await query;
  return (data ?? []).map((row) => mapRow({ ...row, content: '' }));
}

/** Every post regardless of status, newest-updated first — the staff
 * admin list. RLS already scopes this to staff sessions (drafts are
 * invisible to anyone else), so no extra status filter is needed here. */
export async function listAllBlogPostsForAdmin(): Promise<BlogPostSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('blog_posts')
    .select(
      'id, slug, title, excerpt, cover_image_path, cover_image_alt, is_featured, status, meta_description, author_id, published_at, created_at, updated_at',
    )
    .order('updated_at', { ascending: false });

  return (data ?? []).map((row) => mapRow({ ...row, content: '' }));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  return data ? mapRow(data) : null;
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? mapRow(data) : null;
}
