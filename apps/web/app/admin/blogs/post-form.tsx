'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogPost } from '@masahepinas/types';
import type { BlogPostActionResult } from './actions';

const initialState: BlogPostActionResult = { error: null };

/**
 * Shared create/edit form for a blog post. On create, an optional cover
 * image file can be picked right here (createBlogPost uploads it after
 * the row exists). On edit, cover image changes go through the dedicated
 * uploader (see cover-image-manager.tsx) instead — this form only shows
 * the file input when there's no `post` yet. Either way, after a
 * successful create this redirects to the new post's edit page so
 * staff can keep working on it (add/replace the image, etc.).
 */
export function PostForm({
  action,
  post,
  submitLabel,
}: {
  action: (
    prevState: BlogPostActionResult,
    formData: FormData,
  ) => Promise<BlogPostActionResult>;
  post?: BlogPost;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!post && !state.error && state.id) {
      router.push(`/admin/blogs/${state.id}/edit`);
    }
    // Only react to the create case (no `post` means this is the "new
    // post" form) succeeding — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.id, state.error]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm text-foreground-secondary">
          Title
        </label>
        <input
          id="title"
          name="title"
          defaultValue={post?.title}
          required
          minLength={4}
          maxLength={150}
          className="input-field"
          placeholder="e.g. How to Choose a Massage Spa in the Philippines"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="excerpt" className="text-sm text-foreground-secondary">
          Excerpt{' '}
          <span className="text-foreground-secondary">(shown on /blogs cards)</span>
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={post?.excerpt ?? ''}
          maxLength={300}
          rows={2}
          className="input-field"
          placeholder="A one- or two-sentence summary readers see before clicking in."
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="content" className="text-sm text-foreground-secondary">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          defaultValue={post?.content ?? ''}
          required
          minLength={50}
          maxLength={20000}
          rows={16}
          className="input-field font-mono text-xs"
          placeholder={
            '<p>Write the article body here.</p>\n<p>HTML is supported — use <img>, <a>, <h2>, etc.</p>'
          }
        />
        <p className="text-xs text-foreground-secondary">
          HTML is supported (e.g. <code>&lt;p&gt;</code>, <code>&lt;h2&gt;</code>,{' '}
          <code>&lt;img&gt;</code>, <code>&lt;a&gt;</code>) — if your content includes any
          HTML tags, it&apos;s rendered as-is on the published page (only staff can
          publish, so this isn&apos;t sanitized). Otherwise, plain text with a blank line
          between paragraphs works too.
        </p>
      </div>

      {!post ? (
        <div className="space-y-1.5">
          <label htmlFor="file" className="text-sm text-foreground-secondary">
            Cover image <span className="text-foreground-secondary">(optional)</span>
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="input-field"
          />
          <p className="text-xs text-foreground-secondary">
            JPEG, PNG, or WEBP. You can add or replace it later from the edit page too.
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="metaDescription" className="text-sm text-foreground-secondary">
          Meta description{' '}
          <span className="text-foreground-secondary">(SEO, ~155–160 chars)</span>
        </label>
        <textarea
          id="metaDescription"
          name="metaDescription"
          defaultValue={post?.metaDescription ?? ''}
          maxLength={300}
          rows={2}
          className="input-field"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="coverImageAlt" className="text-sm text-foreground-secondary">
          Cover image alt text
        </label>
        <input
          id="coverImageAlt"
          name="coverImageAlt"
          defaultValue={post?.coverImageAlt ?? ''}
          maxLength={150}
          className="input-field"
          placeholder="Describe the cover image for accessibility"
        />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground-secondary">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={post?.isFeatured ?? false}
          />
          Featured on /blogs
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground-secondary">
          Status
          <select
            name="status"
            defaultValue={post?.status ?? 'draft'}
            className="input-field w-auto"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
