'use server';

import { redirect } from 'next/navigation';
import { customerSignUpSchema, signInSchema } from '@masahepinas/validation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@masahepinas/utils';

export interface ActionResult {
  error: string | null;
}

/**
 * Customer registration. Server-side validation is authoritative — the
 * client form uses the same Zod schema, but that alone is never trusted
 * (see docs/security-checklist.md). Supabase requires email verification
 * before the session is fully active (project auth setting, Phase 1).
 *
 * The `profiles` row and default `customer` role are created by the
 * `handle_new_user` DB trigger defined in
 * supabase/migrations/0001_init_profiles_and_roles.sql, reading
 * `display_name`/`city`/`province` out of the signUp `options.data`
 * payload — this keeps profile creation atomic with account creation and
 * matches the RLS plan ("insert on signup trigger only").
 */
export async function signUpCustomer(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = customerSignUpSchema.safeParse({
    displayName: formData.get('displayName'),
    email: formData.get('email'),
    password: formData.get('password'),
    city: formData.get('city') || undefined,
    province: formData.get('province') || undefined,
    acceptedTermsOfService: formData.get('acceptedTermsOfService') === 'on',
    acceptedPrivacyPolicy: formData.get('acceptedPrivacyPolicy') === 'on',
    confirmedTruthfulReviews: formData.get('confirmedTruthfulReviews') === 'on',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid form submission' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
        city: parsed.data.city ?? null,
        province: parsed.data.province ?? null,
      },
    },
  });

  if (error) {
    logger.warn('Customer sign-up failed', { code: error.status ?? null });
    return { error: error.message };
  }

  redirect('/sign-up/check-email');
}

export async function signIn(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid form submission' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logger.warn('Sign-in failed', { code: error.status ?? null });
    return { error: 'Incorrect email or password.' };
  }

  redirect('/');
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/');
}

export interface PasswordResetResult extends ActionResult {
  submitted: boolean;
}

export async function requestPasswordReset(
  _prevState: PasswordResetResult,
  formData: FormData,
): Promise<PasswordResetResult> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    return { error: 'Enter your account email.', submitted: false };
  }

  const supabase = await createSupabaseServerClient();
  // Always respond the same way whether or not the email exists, so this
  // endpoint can't be used to enumerate registered accounts.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/account/reset-password`,
  });

  return { error: null, submitted: true };
}
