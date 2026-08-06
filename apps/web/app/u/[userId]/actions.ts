'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function toggleFollow(
  targetUserId: string,
): Promise<{ following: boolean; error: string | null }> {
  const session = await requireAuth();
  if (session.userId === targetUserId) {
    return { following: false, error: "You can't follow yourself." };
  }
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', session.userId)
    .eq('followee_id', targetUserId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('user_follows').delete().eq('id', existing.id);
    if (error) return { following: true, error: 'Could not unfollow. Please try again.' };
    revalidatePath(`/u/${targetUserId}`);
    return { following: false, error: null };
  }

  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: session.userId, followee_id: targetUserId });
  if (error) return { following: false, error: 'Could not follow. Please try again.' };
  revalidatePath(`/u/${targetUserId}`);
  return { following: true, error: null };
}
