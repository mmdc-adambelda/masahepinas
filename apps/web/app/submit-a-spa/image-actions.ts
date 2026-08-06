'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { IMAGE_LIMITS } from '@masahepinas/config';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ImageActionResult {
  error: string | null;
}

const MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

function matchesAt(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

/** Sniffs the actual file bytes rather than trusting the client-supplied
 * MIME type, per docs/security-checklist.md ("file uploads validated
 * server-side"). A renamed .exe with a fake .jpg extension fails this. */
function detectImageType(bytes: Uint8Array): string | null {
  for (const { mime, bytes: signature } of MAGIC_BYTES) {
    if (matchesAt(bytes, 0, signature)) return mime;
  }
  // WEBP is a RIFF container: bytes 0-3 are "RIFF", bytes 8-11 are "WEBP".
  // Checking both (not just the RIFF prefix shared by WAV/AVI/etc.) avoids
  // misclassifying an unrelated RIFF-family file as a valid WEBP image.
  if (
    matchesAt(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    matchesAt(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return 'image/webp';
  }
  return null;
}

export async function uploadBusinessImage(
  businessId: string,
  _prevState: ImageActionResult,
  formData: FormData,
): Promise<ImageActionResult> {
  await requireRole('spa_owner');
  const supabase = await createSupabaseServerClient();

  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'No file selected.' };
  if (file.size > IMAGE_LIMITS.maxFileSizeBytes) {
    return {
      error: `Image must be under ${IMAGE_LIMITS.maxFileSizeBytes / (1024 * 1024)} MB.`,
    };
  }

  const { count } = await supabase
    .from('business_images')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId);
  if ((count ?? 0) >= IMAGE_LIMITS.maxImagesPerListing) {
    return {
      error: `You can only upload up to ${IMAGE_LIMITS.maxImagesPerListing} images.`,
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
  const storagePath = `${businessId}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('business-images')
    .upload(storagePath, buffer, { contentType: detectedType, upsert: false });
  if (uploadError) return { error: 'Upload failed. Please try again.' };

  const isPrimary = (count ?? 0) === 0; // first image becomes the primary/logo by default
  const { error: insertError } = await supabase.from('business_images').insert({
    business_id: businessId,
    storage_path: storagePath,
    caption: String(formData.get('caption') ?? '').trim() || null,
    alt_text: String(formData.get('altText') ?? '').trim() || null,
    is_primary: isPrimary,
    position: count ?? 0,
  });

  if (insertError) {
    await supabase.storage.from('business-images').remove([storagePath]);
    return { error: 'Could not save the image. Please try again.' };
  }

  revalidatePath('/submit-a-spa');
  return { error: null };
}

export async function deleteBusinessImage(
  businessId: string,
  imageId: string,
  storagePath: string,
): Promise<ImageActionResult> {
  await requireRole('spa_owner');
  const supabase = await createSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from('business_images')
    .delete()
    .eq('id', imageId)
    .eq('business_id', businessId);
  if (deleteError) return { error: 'Could not remove the image.' };

  await supabase.storage.from('business-images').remove([storagePath]);
  revalidatePath('/submit-a-spa');
  return { error: null };
}

export async function setPrimaryImage(
  businessId: string,
  imageId: string,
): Promise<ImageActionResult> {
  await requireRole('spa_owner');
  const supabase = await createSupabaseServerClient();

  await supabase
    .from('business_images')
    .update({ is_primary: false })
    .eq('business_id', businessId);
  const { error } = await supabase
    .from('business_images')
    .update({ is_primary: true })
    .eq('id', imageId)
    .eq('business_id', businessId);
  if (error) return { error: 'Could not update the primary image.' };

  revalidatePath('/submit-a-spa');
  return { error: null };
}
