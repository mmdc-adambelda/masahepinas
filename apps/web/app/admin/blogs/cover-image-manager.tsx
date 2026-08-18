'use client';

import { useActionState, useRef } from 'react';
import { IMAGE_LIMITS } from '@masahepinas/config';
import { removeCoverImage, uploadCoverImage, type BlogPostActionResult } from './actions';

const initialState: BlogPostActionResult = { error: null };
const maxSizeMb = IMAGE_LIMITS.maxFileSizeBytes / (1024 * 1024);

export function CoverImageManager({
  postId,
  coverImageUrl,
  coverImageAlt,
}: {
  postId: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
}) {
  const uploadWithId = uploadCoverImage.bind(null, postId);
  const [state, formAction, isPending] = useActionState(uploadWithId, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-3">
      {coverImageUrl ? (
        <div className="card max-w-xs space-y-2 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt={coverImageAlt ?? ''}
            className="aspect-video w-full rounded-md object-cover"
          />
          <button
            type="button"
            className="text-xs text-danger hover:underline"
            onClick={() => removeCoverImage(postId)}
          >
            Remove cover image
          </button>
        </div>
      ) : (
        <p className="text-sm text-foreground-secondary">No cover image yet.</p>
      )}

      <form
        ref={formRef}
        action={(formData) => {
          formAction(formData);
          formRef.current?.reset();
        }}
        className="card flex flex-wrap items-end gap-3 p-3"
      >
        <div className="space-y-1.5">
          <label htmlFor="cover-file" className="text-sm text-foreground-secondary">
            {coverImageUrl ? 'Replace cover image' : 'Upload cover image'}
          </label>
          <input
            id="cover-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="input-field"
          />
        </div>
        <button type="submit" className="btn-secondary" disabled={isPending}>
          {isPending ? 'Uploading…' : 'Upload'}
        </button>
      </form>
      <p className="text-xs text-foreground-secondary">
        JPEG, PNG, or WEBP, up to {maxSizeMb} MB.
      </p>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
