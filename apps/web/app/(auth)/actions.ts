'use server';

import { redirect } from 'next/navigation';
import {
  customerSignUpSchema,
  signInSchema,
  spaOwnerSignUpSchema,
} from '@masahepinas/validation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@masahepinas/utils';

export interface ActionResult {
  error: string | null;
}

/**
 * Customer registration. Server-side validation is authoritative — the
 * client form uses the same Zod schema, but that alone is never trusted
 * (see docs/security-checklist.md). Email confirmation is disabled
 * (project auth setting) — a session starts immediately, and access is
 * instead gated on superadmin approval (`profiles.status =
 * 'pending_approval'` by default; see
 * supabase/migrations/0013_registration_approval.sql and
 * apps/web/lib/supabase/middleware.ts).
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

  // With email confirmation disabled (see docs/launch-checklist.md
  // "registration approval"), signUp() returns an active session
  // immediately — there's no email to go check. Redirect home; the
  // middleware registration-approval gate (new accounts start
  // 'pending_approval') sends them to /pending-approval automatically.
  redirect('/');
}

/**
 * Spa owner registration. Creates the auth account plus (via the
 * `handle_new_user` DB trigger — see
 * supabase/migrations/0004_spa_owner_signup.sql) the `spa_owner` role and a
 * draft `spa_businesses` row in `pending_review` status. The owner
 * completes location/hours/services/photos afterwards on `/submit-a-spa`
 * once signed in and approved — that page requires a real session so
 * image uploads can be authorized by RLS (`owns_business`), and access
 * itself requires clearing the registration-approval gate (see
 * signUpCustomer's doc comment above).
 */
export async function signUpSpaOwner(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = spaOwnerSignUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    contactNumber: formData.get('contactNumber'),
    password: formData.get('password'),
    businessName: formData.get('businessName'),
    acceptedListingPolicies: formData.get('acceptedListingPolicies') === 'on',
    confirmedLegitimateService: formData.get('confirmedLegitimateService') === 'on',
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
        display_name: parsed.data.fullName,
        intended_role: 'spa_owner',
        business_name: parsed.data.businessName,
        business_contact_number: parsed.data.contactNumber,
      },
    },
  });

  if (error) {
    logger.warn('Spa owner sign-up failed', { code: error.status ?? null });
    return { error: error.message };
  }

  // With email confirmation disabled (see docs/launch-checklist.md
  // "registration approval"), signUp() returns an active session
  // immediately — there's no email to go check. Redirect home; the
  // middleware registration-approval gate (new accounts start
  // 'pending_approval') sends them to /pending-approval automatically.
  redirect('/');
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
