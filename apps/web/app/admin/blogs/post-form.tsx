'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogPost } from '@masahepinas/types';
import type { BlogPostActionResult } from './actions';

const initialState: BlogPostActionResult = { error: null };

/**
 * Shared create/edit form for a blog post's text fields. Cover image
 * upload is handled separately (see cover-image-manager.tsx) since it
 * only makes sense once a post row exists to attach the image to — so on
 * a successful *create*, this redirects straight to the new post's edit
 * page where the cover image uploader lives.
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
          placeholder="Write the article body. Leave a blank line between paragraphs."
        />
        <p className="text-xs text-foreground-secondary">
          Plain text — separate paragraphs with a blank line. No HTML needed.
        </p>
      </div>

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
