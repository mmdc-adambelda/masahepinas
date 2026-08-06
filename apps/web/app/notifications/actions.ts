'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function markNotificationRead(notificationId: string): Promise<void> {
  const session = await requireAuth();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', session.userId);
  revalidatePath('/notifications');
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await requireAuth();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', session.userId)
    .eq('is_read', false);
  revalidatePath('/notifications');
}
