'use server';

import { redirect } from 'next/navigation';
import { passwordSchema } from '@masahepinas/validation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ActionResult } from '../../(auth)/actions';

/**
 * Completes a password reset. Requires an active recovery session, which
 * is established by /auth/callback exchanging the emailed one-time code
 * before the user reaches this page — so no token is handled here directly.
 */
export async function updatePassword(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(formData.get('password'));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid password' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });

  if (error) {
    return {
      error: 'Could not update your password. Request a new reset link and try again.',
    };
  }

  redirect('/sign-in');
}
