'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface BadgeResult {
  error: string | null;
}

export async function createBadge(_prevState: BadgeResult, formData: FormData): Promise<BadgeResult> {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const slug = String(formData.get('slug') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const tierRaw = String(formData.get('tier') ?? '').trim();

  if (!slug || !name) return { error: 'Slug and name are required.' };

  const { error } = await supabase.from('badges').insert({
    slug,
    name,
    description: description || null,
    tier: tierRaw ? Number(tierRaw) : null,
  });
  if (error) return { error: 'Could not create the badge. The slug may already exist.' };

  revalidatePath('/admin/badges');
  return { error: null };
}

export async function deleteBadge(badgeId: string): Promise<BadgeResult> {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('badges').delete().eq('id', badgeId);
  if (error) return { error: 'Could not delete the badge.' };

  revalidatePath('/admin/badges');
  return { error: null };
}
