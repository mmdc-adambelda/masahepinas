'use client';

import { useActionState, useRef } from 'react';
import type { BusinessImage } from '@masahepinas/types';
import { IMAGE_LIMITS } from '@masahepinas/config';
import {
  deleteBusinessImage,
  setPrimaryImage,
  uploadBusinessImage,
  type ImageActionResult,
} from '@/lib/business-image-actions';

const initialState: ImageActionResult = { error: null };
const maxSizeMb = IMAGE_LIMITS.maxFileSizeBytes / (1024 * 1024);

/**
 * Business photo manager — shared by the spa owner's own listing editor
 * (apps/web/app/submit-a-spa) and the staff admin listing editor
 * (apps/web/app/admin/spas/[id]/edit/page.tsx). The first/primary photo
 * doubles as the business's logo/banner shown on its public listing card
 * and detail page.
 */
export function ImageManager({
  businessId,
  images,
}: {
  businessId: string;
  images: BusinessImage[];
}) {
  const uploadWithId = uploadBusinessImage.bind(null, businessId);
  const [state, formAction, isPending] = useActionState(uploadWithId, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const canAddMore = images.length < IMAGE_LIMITS.maxImagesPerListing;

  return (
    <div className="space-y-4">
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {images.map((image) => (
            <div key={image.id} className="card space-y-2 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.publicUrl}
                alt={image.altText ?? ''}
                className="aspect-square w-full rounded-md object-cover"
              />
              <div className="flex items-center justify-between text-xs">
                {image.isPrimary ? (
                  <span className="text-brand-accent">Logo / banner</span>
                ) : (
                  <button
                    type="button"
                    className="text-foreground-secondary hover:text-foreground"
                    onClick={() => setPrimaryImage(businessId, image.id)}
                  >
                    Set as logo/banner
                  </button>
                )}
                <button
                  type="button"
                  className="text-danger hover:underline"
                  onClick={() =>
                    deleteBusinessImage(businessId, image.id, image.storagePath)
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {canAddMore ? (
        <form
          ref={formRef}
          action={(formData) => {
            formAction(formData);
            formRef.current?.reset();
          }}
          className="card space-y-3 p-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="file" className="text-sm text-foreground-secondary">
              Upload a logo, banner, or business photo
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="input-field"
            />
            <p className="text-xs text-foreground-secondary">
              JPEG, PNG, or WEBP, up to {maxSizeMb} MB. The first photo becomes the
              business&apos;s logo/banner shown on its listing — you can change which one
              is primary at any time.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="altText" className="text-sm text-foreground-secondary">
              Alt text (for accessibility)
            </label>
            <input
              id="altText"
              name="altText"
              className="input-field"
              placeholder="e.g. Reception area"
            />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          <button type="submit" className="btn-secondary" disabled={isPending}>
            {isPending ? 'Uploading…' : 'Upload photo'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-foreground-secondary">
          You&apos;ve reached the {IMAGE_LIMITS.maxImagesPerListing}-image limit. Remove a
          photo to add another.
        </p>
      )}
    </div>
  );
}
