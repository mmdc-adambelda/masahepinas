'use server';

import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AppealSubmitResult {
  error: string | null;
}

export async function submitAppeal(
  actionId: string,
  _prevState: AppealSubmitResult,
  formData: FormData,
): Promise<AppealSubmitResult> {
  const session = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const message = String(formData.get('message') ?? '').trim();
  if (message.length < 10) {
    return { error: 'Explain your appeal in at least 10 characters.' };
  }

  const { error } = await supabase.from('appeals').insert({
    moderation_action_id: actionId,
    submitted_by: session.userId,
    message,
  });
  if (error) return { error: 'Could not submit your appeal. Please try again.' };

  redirect('/appeals/new/submitted');
}
