'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function runExpirationSweep(): Promise<{
  count: number | null;
  error: string | null;
}> {
  await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc('expire_due_subscriptions');
  if (error) return { count: null, error: 'Could not run the expiration sweep.' };

  revalidatePath('/admin');
  return { count: data ?? 0, error: null };
}
