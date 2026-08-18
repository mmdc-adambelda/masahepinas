import type { BlogPostStatus } from './enums';

/** App-level (camelCase) shape of a staff-authored blog/article post.
 * Mirrors `public.blog_posts` (supabase/migrations/0019_blog_posts.sql). */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  isFeatured: boolean;
  status: BlogPostStatus;
  metaDescription: string | null;
  authorId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Slim shape for list views (admin list, /blogs hub cards) — leaves out
 * the full `content` body that only the reader page needs. */
export type BlogPostSummary = Omit<BlogPost, 'content'>;
