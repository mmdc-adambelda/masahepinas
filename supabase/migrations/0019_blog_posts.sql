-- Staff-authored blog/article CMS: draft/publish workflow, an optional
-- "featured" flag surfaced on /blogs, and a cover image. This backs the
-- admin blog editor (apps/web/app/admin/blogs/*) and the public /blogs
-- hub + /blogs/[slug] reader (apps/web/app/blogs/*). It is separate from
-- the hand-authored SEO guide at /blogs/cavite-spa, which stays a static
-- page rather than a DB row.

create type blog_post_status as enum ('draft', 'published');

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content text not null,
  cover_image_path text,
  cover_image_alt text,
  is_featured boolean not null default false,
  status blog_post_status not null default 'draft',
  meta_description text,
  author_id uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blog_posts_status_published_idx
  on public.blog_posts (status, published_at desc);
create index blog_posts_featured_idx
  on public.blog_posts (is_featured) where is_featured;

create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

-- Published posts are public; drafts are staff-only (authors can preview
-- their own unpublished work before publishing).
create policy "blog_posts_select"
  on public.blog_posts for select
  using (status = 'published' or public.is_staff(auth.uid()));

-- Any staff member (moderator or superadmin) can author/edit/publish/
-- delete a post — same staff-inclusive model as business photo
-- management (see 0003_spa_directory.sql's business_images_write).
create policy "blog_posts_write"
  on public.blog_posts for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------
-- Storage: blog-images bucket for cover images. Same 2MB cap as
-- business-images (see 0018_reduce_image_size_limit.sql) and the same
-- MIME allowlist. Public read (published articles need publicly loadable
-- images); writes are staff-only, unlike business-images which also
-- allows the business owner.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images', 'blog-images', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "blog_images_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'blog-images');

create policy "blog_images_storage_staff_insert"
  on storage.objects for insert
  with check (bucket_id = 'blog-images' and public.is_staff(auth.uid()));

create policy "blog_images_storage_staff_update"
  on storage.objects for update
  using (bucket_id = 'blog-images' and public.is_staff(auth.uid()));

create policy "blog_images_storage_staff_delete"
  on storage.objects for delete
  using (bucket_id = 'blog-images' and public.is_staff(auth.uid()));
