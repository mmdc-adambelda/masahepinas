'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { verificationDetailsSchema } from '@masahepinas/validation';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface VerificationResult {
  error: string | null;
  success?: boolean;
}

const MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // "%PDF"
];

function detectDocType(bytes: Uint8Array): string | null {
  for (const { mime, bytes: signature } of MAGIC_BYTES) {
    if (signature.every((byte, i) => bytes[i] === byte)) return mime;
  }
  return null;
}

/**
 * Saves the owner's verification attestation (business permit / gov't
 * registration references, contact info) and, optionally, a private
 * supporting document. This does NOT change the listing's verification
 * status — that stays a staff-only decision made from `/admin/listings`
 * (docs/moderation-policy.md §5). Document is uploaded to the private
 * `verification-documents` bucket, never publicly readable.
 */
export async function saveVerificationDetails(
  _prevState: VerificationResult,
  formData: FormData,
): Promise<VerificationResult> {
  const session = await requireRole('spa_owner');
  const supabase = await createSupabaseServerClient();

  const parsed = verificationDetailsSchema.safeParse({
    fullName: formData.get('fullName') || undefined,
    contactNumber: formData.get('contactNumber') || undefined,
    businessPermitReference: formData.get('businessPermitReference') || undefined,
    governmentRegistrationReference:
      formData.get('governmentRegistrationReference') || undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Check your verification details.',
    };
  }

  let documentPath: string | undefined;
  const file = formData.get('document');
  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) {
      return { error: 'Document must be under 10 MB.' };
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    const detected = detectDocType(buffer);
    if (!detected) {
      return { error: 'That file is not a valid JPEG, PNG, or PDF document.' };
    }
    const extension =
      detected === 'application/pdf'
        ? 'pdf'
        : detected.split('/')[1] === 'jpeg'
          ? 'jpg'
          : 'png';
    documentPath = `${session.userId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(documentPath, buffer, { contentType: detected, upsert: false });
    if (uploadError) return { error: 'Could not upload the document. Please try again.' };
  }

  const { error } = await supabase.from('spa_owners').upsert(
    {
      user_id: session.userId,
      full_name: parsed.data.fullName || null,
      contact_number: parsed.data.contactNumber || null,
      business_permit_reference: parsed.data.businessPermitReference || null,
      government_registration_reference:
        parsed.data.governmentRegistrationReference || null,
      ...(documentPath ? { verification_document_path: documentPath } : {}),
    },
    { onConflict: 'user_id' },
  );
  if (error)
    return { error: 'Could not save your verification details. Please try again.' };

  revalidatePath('/submit-a-spa');
  return { error: null, success: true };
}
