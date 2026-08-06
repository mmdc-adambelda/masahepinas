'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface FeaturedResult {
  error: string | null;
}

export async function addFeaturedPlacement(
  _prevState: FeaturedResult,
  formData: FormData,
): Promise<FeaturedResult> {
  const session = await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const slug = String(formData.get('slug') ?? '').trim();
  const placementKey = String(formData.get('placementKey') ?? '').trim();
  if (!slug || !placementKey) {
    return { error: 'Business slug and placement key are required.' };
  }

  const { data: business } = await supabase
    .from('spa_businesses')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (!business) return { error: `No listing found with slug "${slug}".` };

  const { error } = await supabase.from('featured_placements').insert({
    business_id: business.id,
    placement_key: placementKey,
    created_by: session.userId,
  });
  if (error) return { error: 'Could not add the featured placement. Please try again.' };

  revalidatePath('/admin/featured');
  return { error: null };
}

export async function removeFeaturedPlacement(placementId: string): Promise<FeaturedResult> {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('featured_placements').delete().eq('id', placementId);
  if (error) return { error: 'Could not remove the placement.' };

  revalidatePath('/admin/featured');
  return { error: null };
}
