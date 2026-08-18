'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { blogPostSchema } from '@masahepinas/validation';
import { slugify } from '@masahepinas/utils';
import { IMAGE_LIMITS } from '@masahepinas/config';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface BlogPostActionResult {
  error: string | null;
  slug?: string;
  id?: string;
}

const MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

function matchesAt(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

/** Same server-side byte-sniffing as business image uploads (see
 * apps/web/lib/business-image-actions.ts) — never trust the client's
 * declared MIME type. */
function detectImageType(bytes: Uint8Array): string | null {
  for (const { mime, bytes: signature } of MAGIC_BYTES) {
    if (matchesAt(bytes, 0, signature)) return mime;
  }
  if (
    matchesAt(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    matchesAt(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return 'image/webp';
  }
  return null;
}

function parseFormFields(formData: FormData) {
  return blogPostSchema.safeParse({
    title: formData.get('title'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    metaDescription: formData.get('metaDescription'),
    coverImageAlt: formData.get('coverImageAlt'),
    isFeatured: formData.get('isFeatured') === 'on',
    status: formData.get('status'),
  });
}

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Validates + uploads a cover image file to the blog-images bucket for
 * `postId`, returning the new storage path. Shared by `createBlogPost`
 * (image picked at creation time) and `uploadCoverImage` (image added/
 * replaced later from the edit page). */
async function uploadBlogImageFile(
  supabase: SupabaseClient,
  postId: string,
  file: File,
): Promise<{ storagePath: string } | { error: string }> {
  if (file.size > IMAGE_LIMITS.maxFileSizeBytes) {
    return {
      error: `Image must be under ${IMAGE_LIMITS.maxFileSizeBytes / (1024 * 1024)} MB.`,
    };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectImageType(buffer);
  if (
    !detectedType ||
    !IMAGE_LIMITS.allowedMimeTypes.includes(
      detectedType as (typeof IMAGE_LIMITS.allowedMimeTypes)[number],
    )
  ) {
    return { error: 'That file is not a valid JPEG, PNG, or WEBP image.' };
  }

  const extension =
    detectedType.split('/')[1] === 'jpeg' ? 'jpg' : detectedType.split('/')[1];
  const storagePath = `${postId}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('blog-images')
    .upload(storagePath, buffer, { contentType: detectedType, upsert: false });
  if (uploadError) return { error: 'Upload failed. Please try again.' };

  return { storagePath };
}

/** Staff (moderator or superadmin) can author, edit, publish, and delete
 * blog posts — same staff-inclusive model used for business photo
 * management. See blog_posts_write in supabase/migrations/0019_blog_posts.sql. */
export async function createBlogPost(
  _prevState: BlogPostActionResult,
  formData: FormData,
): Promise<BlogPostActionResult> {
  const session = await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const parsed = parseFormFields(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const baseSlug = slugify(parsed.data.title) || 'post';
  let finalSlug = baseSlug;
  let attempt = 0;
  while (attempt < 5) {
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();
    if (!existing) break;
    attempt += 1;
    finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const isPublishing = parsed.data.status === 'published';
  const { data: created, error } = await supabase
    .from('blog_posts')
    .insert({
      slug: finalSlug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt || null,
      content: parsed.data.content,
      meta_description: parsed.data.metaDescription || null,
      cover_image_alt: parsed.data.coverImageAlt || null,
      is_featured: parsed.data.isFeatured ?? false,
      status: parsed.data.status,
      author_id: session.userId,
      published_at: isPublishing ? new Date().toISOString() : null,
    })
    .select('id, slug')
    .single();

  if (error || !created) return { error: 'Could not create the post. Please try again.' };

  // A cover image is optional at creation time — the "New post" form
  // includes the same file input as the edit page's cover image
  // manager, so staff don't have to save first and hunt for the
  // uploader afterward.
  const file = formData.get('file');
  if (file instanceof File && file.size > 0) {
    const result = await uploadBlogImageFile(supabase, created.id, file);
    if ('error' in result) {
      // The post itself was created successfully; only the image failed.
      // Surface that distinctly rather than pretending creation failed.
      revalidatePath('/admin/blogs');
      revalidatePath('/blogs');
      return {
        error: `Post saved, but the cover image failed: ${result.error}`,
        slug: created.slug,
        id: created.id,
      };
    }
    await supabase
      .from('blog_posts')
      .update({ cover_image_path: result.storagePath })
      .eq('id', created.id);
  }

  revalidatePath('/admin/blogs');
  revalidatePath('/blogs');
  return { error: null, slug: created.slug, id: created.id };
}

export async function updateBlogPost(
  postId: string,
  _prevState: BlogPostActionResult,
  formData: FormData,
): Promise<BlogPostActionResult> {
  await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const parsed = parseFormFields(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const { data: before } = await supabase
    .from('blog_posts')
    .select('status, published_at, slug')
    .eq('id', postId)
    .maybeSingle();
  if (!before) return { error: 'Post not found.' };

  const isNowPublishing = parsed.data.status === 'published';
  const { error } = await supabase
    .from('blog_posts')
    .update({
      title: parsed.data.title,
      excerpt: parsed.data.excerpt || null,
      content: parsed.data.content,
      meta_description: parsed.data.metaDescription || null,
      cover_image_alt: parsed.data.coverImageAlt || null,
      is_featured: parsed.data.isFeatured ?? false,
      status: parsed.data.status,
      // Set published_at the first time a post goes live; keep the
      // original publish date on later edits rather than bumping it.
      published_at:
        isNowPublishing && !before.published_at
          ? new Date().toISOString()
          : before.published_at,
    })
    .eq('id', postId);
  if (error) return { error: 'Could not update the post. Please try again.' };

  revalidatePath('/admin/blogs');
  revalidatePath(`/admin/blogs/${postId}/edit`);
  revalidatePath('/blogs');
  revalidatePath(`/blogs/${before.slug}`);
  return { error: null, slug: before.slug };
}

export async function deleteBlogPost(postId: string): Promise<BlogPostActionResult> {
  await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('slug, cover_image_path')
    .eq('id', postId)
    .maybeSingle();

  const { error } = await supabase.from('blog_posts').delete().eq('id', postId);
  if (error) return { error: 'Could not delete the post.' };

  if (post?.cover_image_path) {
    await supabase.storage.from('blog-images').remove([post.cover_image_path]);
  }

  revalidatePath('/admin/blogs');
  revalidatePath('/blogs');
  if (post?.slug) revalidatePath(`/blogs/${post.slug}`);
  return { error: null };
}

export async function uploadCoverImage(
  postId: string,
  _prevState: BlogPostActionResult,
  formData: FormData,
): Promise<BlogPostActionResult> {
  await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'No file selected.' };

  const { data: post } = await supabase
    .from('blog_posts')
    .select('slug, cover_image_path')
    .eq('id', postId)
    .maybeSingle();
  if (!post) return { error: 'Post not found.' };

  const result = await uploadBlogImageFile(supabase, postId, file);
  if ('error' in result) return { error: result.error };

  const { error: updateError } = await supabase
    .from('blog_posts')
    .update({ cover_image_path: result.storagePath })
    .eq('id', postId);
  if (updateError) {
    await supabase.storage.from('blog-images').remove([result.storagePath]);
    return { error: 'Could not save the cover image. Please try again.' };
  }

  // Replacing a cover image — clean up the old file so the bucket
  // doesn't accumulate orphaned uploads.
  if (post.cover_image_path) {
    await supabase.storage.from('blog-images').remove([post.cover_image_path]);
  }

  revalidatePath(`/admin/blogs/${postId}/edit`);
  revalidatePath('/blogs');
  revalidatePath(`/blogs/${post.slug}`);
  return { error: null };
}

export async function removeCoverImage(postId: string): Promise<BlogPostActionResult> {
  await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('slug, cover_image_path')
    .eq('id', postId)
    .maybeSingle();
  if (!post) return { error: 'Post not found.' };

  const { error } = await supabase
    .from('blog_posts')
    .update({ cover_image_path: null })
    .eq('id', postId);
  if (error) return { error: 'Could not remove the cover image.' };

  if (post.cover_image_path) {
    await supabase.storage.from('blog-images').remove([post.cover_image_path]);
  }

  revalidatePath(`/admin/blogs/${postId}/edit`);
  revalidatePath('/blogs');
  revalidatePath(`/blogs/${post.slug}`);
  return { error: null };
}
