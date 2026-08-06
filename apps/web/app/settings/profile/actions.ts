'use server';

import { revalidatePath } from 'next/cache';
import { profileUpdateSchema } from '@masahepinas/validation';
import { requireAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface SettingsResult {
  error: string | null;
  success?: boolean;
}

export async function updateProfileSettings(
  _prevState: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  const session = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const parsed = profileUpdateSchema.safeParse({
    displayName: formData.get('displayName'),
    bio: formData.get('bio') || undefined,
    city: formData.get('city') || undefined,
    province: formData.get('province') || undefined,
    isPrivate: formData.get('isPrivate') === 'on',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check your profile details.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      is_private: parsed.data.isPrivate ?? false,
    })
    .eq('id', session.userId);

  if (error) return { error: 'Could not save your profile. Please try again.' };

  revalidatePath('/settings/profile');
  revalidatePath(`/u/${session.userId}`);
  return { error: null, success: true };
}
