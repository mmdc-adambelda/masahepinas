'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function toggleSavedBusiness(
  businessId: string,
  slug: string,
): Promise<{ saved: boolean; error: string | null }> {
  const session = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from('saved_businesses')
    .select('id')
    .eq('user_id', session.userId)
    .eq('business_id', businessId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('saved_businesses')
      .delete()
      .eq('id', existing.id);
    if (error) return { saved: true, error: 'Could not unsave. Please try again.' };
    revalidatePath(`/spa/${slug}`);
    return { saved: false, error: null };
  }

  const { error } = await supabase
    .from('saved_businesses')
    .insert({ user_id: session.userId, business_id: businessId });
  if (error) return { saved: false, error: 'Could not save. Please try again.' };
  revalidatePath(`/spa/${slug}`);
  return { saved: true, error: null };
}
