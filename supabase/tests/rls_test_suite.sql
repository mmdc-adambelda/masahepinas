-- =====================================================================
-- Masahe Pinas — RLS / Permission Boundary Test Suite (Phase 8)
-- =====================================================================
-- Purpose: exercise the row-level-security policies from migrations
-- 0001-0014 as each of the app's real personas (guest/anon, customer,
-- a second customer, spa_owner, moderator, superadmin) and assert the
-- expected allow/deny outcome for the boundary cases called out in
-- docs/security-checklist.md and docs/permissions.md.
--
-- SAFETY: the whole suite runs inside one transaction that always ends
-- in ROLLBACK — it creates disposable auth.users/profiles/business/
-- review fixtures, asserts against them, and then undoes everything.
-- It is safe to run against a live/production-configured project. Do
-- not remove the final ROLLBACK.
--
-- HOW TO RUN: paste this whole file into the Supabase SQL Editor and
-- run it once, OR `psql "$DATABASE_URL" -f supabase/tests/rls_test_suite.sql`.
-- Each assertion prints a PASS notice as it runs (view "Logs"/messages
-- in the SQL Editor, or run psql with default verbosity). The script
-- raises an exception (and stops) on the first failed assertion, naming
-- exactly which check failed. Reaching the final
-- "ALL ASSERTIONS PASSED" notice means every check in this file passed.
-- Re-runnable any number of times — nothing persists.
--
-- Two different failure shapes are tested for, matching how Postgres
-- RLS actually behaves:
--   - INSERT whose WITH CHECK fails, or a BEFORE-trigger guard that
--     explicitly RAISEs — these throw a real exception. Asserted with
--     expect_denied().
--   - UPDATE/DELETE/SELECT where the USING clause simply filters the
--     target row out — these do NOT throw, they silently affect/return
--     zero rows. Asserted with expect_rows(..., 0) / a plain count check.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Assertion helpers
-- ---------------------------------------------------------------------
create or replace function pg_temp.assert(description text, condition boolean)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'FAIL: %', description;
  end if;
  raise notice 'PASS: %', description;
end;
$$;

-- Executes a dynamic DML statement and asserts it raised a permission
-- error (RLS WITH CHECK violation or an explicit guard-trigger RAISE).
create or replace function pg_temp.expect_denied(description text, sql text)
returns void
language plpgsql
as $$
begin
  begin
    execute sql;
    raise exception 'FAIL: % (expected the statement to be denied, but it succeeded)', description;
  exception
    when insufficient_privilege or raise_exception then
      raise notice 'PASS: %', description;
  end;
end;
$$;

-- Executes a dynamic UPDATE/DELETE and asserts exactly `expected` rows
-- were affected (used for RLS USING-clause filtering, which silently
-- excludes rows rather than raising).
create or replace function pg_temp.expect_rows(description text, sql text, expected int)
returns void
language plpgsql
as $$
declare
  affected int;
begin
  execute sql;
  get diagnostics affected = row_count;
  if affected <> expected then
    raise exception 'FAIL: % (expected % row(s) affected, got %)', description, expected, affected;
  end if;
  raise notice 'PASS: %', description;
end;
$$;

-- Sets the JWT-derived GUCs that auth.uid()/auth.role() read. Sets both
-- the flat `request.jwt.claim.*` vars and the JSON `request.jwt.claims`
-- blob so this suite works regardless of which auth.uid() implementation
-- the target project's Supabase version ships.
create or replace function pg_temp.set_persona(p_uid uuid, p_role text)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  perform set_config('request.jwt.claim.role', p_role, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
end;
$$;

-- ---------------------------------------------------------------------
-- Fixtures: five disposable auth.users, each with a persona role.
-- Inserting into auth.users fires handle_new_user (0001), which creates
-- the matching profiles + a default 'customer' user_roles row; extra
-- roles are granted below directly.
-- ---------------------------------------------------------------------
do $$
declare
  v_instance uuid := '00000000-0000-0000-0000-000000000000';
begin
  insert into auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
     created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
     confirmation_token, recovery_token, email_change_token_new, email_change)
  values
    (v_instance, '00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated',
     'rls-test-customer-a@example.invalid', crypt('test-password', gen_salt('bf')), now(),
     now(), now(), '{}', '{"display_name":"RLS Test Customer A"}', false, '', '', '', ''),
    (v_instance, '00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated',
     'rls-test-customer-b@example.invalid', crypt('test-password', gen_salt('bf')), now(),
     now(), now(), '{}', '{"display_name":"RLS Test Customer B"}', false, '', '', '', ''),
    (v_instance, '00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated',
     'rls-test-owner@example.invalid', crypt('test-password', gen_salt('bf')), now(),
     now(), now(), '{}', '{"display_name":"RLS Test Owner"}', false, '', '', '', ''),
    (v_instance, '00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated',
     'rls-test-moderator@example.invalid', crypt('test-password', gen_salt('bf')), now(),
     now(), now(), '{}', '{"display_name":"RLS Test Moderator"}', false, '', '', '', ''),
    (v_instance, '00000000-0000-0000-0000-0000000000a5', 'authenticated', 'authenticated',
     'rls-test-superadmin@example.invalid', crypt('test-password', gen_salt('bf')), now(),
     now(), now(), '{}', '{"display_name":"RLS Test Superadmin"}', false, '', '', '', '');
end $$;

-- Grant the non-default roles (customer role was already added by the trigger).
insert into public.user_roles (user_id, role)
values
  ('00000000-0000-0000-0000-0000000000a3', 'spa_owner'),
  ('00000000-0000-0000-0000-0000000000a4', 'moderator'),
  ('00000000-0000-0000-0000-0000000000a5', 'superadmin');

-- A verified business owned by persona A3, plus a review by A1 on it.
insert into public.spa_businesses
  (id, owner_id, business_name, slug, description, status, is_premium, is_recommended)
values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a3',
   'RLS Test Spa', 'rls-test-spa', 'fixture', 'verified', false, false);

insert into public.reviews (id, business_id, customer_id, overall_rating, body, moderation_status)
values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-0000000000a1', 5, 'fixture review', 'visible');

-- Persona shorthand for readability below.
-- a1 = customer_a (owns the review)   a2 = customer_b (unrelated customer)
-- a3 = spa_owner (owns the business)  a4 = moderator   a5 = superadmin

-- =====================================================================
-- profiles / user_roles (0001, 0002)
-- =====================================================================
set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a2', 'authenticated');

select pg_temp.expect_rows(
  'customer can update own profile',
  $q$update public.profiles set bio = 'updated by self' where id = '00000000-0000-0000-0000-0000000000a2'$q$,
  1
);

select pg_temp.expect_rows(
  'customer cannot update another customer''s profile (RLS filters the row, 0 rows affected)',
  $q$update public.profiles set bio = 'hijacked' where id = '00000000-0000-0000-0000-0000000000a1'$q$,
  0
);

select pg_temp.expect_denied(
  'customer cannot self-grant the superadmin role',
  $q$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000a2', 'superadmin')$q$
);

select pg_temp.expect_denied(
  'customer cannot self-approve their own pending registration (guard trigger, 0014)',
  $q$update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000a2'$q$
);

reset role;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a5', 'authenticated');

select pg_temp.expect_rows(
  'superadmin can grant a role to another user',
  $q$insert into public.user_roles (user_id, role, granted_by) values ('00000000-0000-0000-0000-0000000000a2', 'moderator', '00000000-0000-0000-0000-0000000000a5')$q$,
  1
);
delete from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000a2' and role = 'moderator';

select pg_temp.expect_rows(
  'superadmin (staff) can approve a pending registration',
  $q$update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000a2'$q$,
  1
);

reset role;

-- =====================================================================
-- spa_businesses (0003) — protected column guard + ownership boundary
-- =====================================================================
set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a3', 'authenticated');

select pg_temp.expect_rows(
  'owner can update their own listing''s editable fields',
  $q$update public.spa_businesses set description = 'owner edit' where id = '00000000-0000-0000-0000-0000000000b1'$q$,
  1
);

select pg_temp.expect_denied(
  'owner cannot set is_premium on their own listing (guard trigger)',
  $q$update public.spa_businesses set is_premium = true where id = '00000000-0000-0000-0000-0000000000b1'$q$
);

select pg_temp.expect_denied(
  'owner cannot set is_recommended on their own listing (guard trigger)',
  $q$update public.spa_businesses set is_recommended = true where id = '00000000-0000-0000-0000-0000000000b1'$q$
);

reset role;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a2', 'authenticated');

select pg_temp.expect_rows(
  'a non-owner customer cannot update someone else''s listing (RLS filters the row)',
  $q$update public.spa_businesses set description = 'hijacked' where id = '00000000-0000-0000-0000-0000000000b1'$q$,
  0
);

reset role;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a4', 'authenticated');

select pg_temp.expect_rows(
  'moderator can change listing status (verify/reject)',
  $q$update public.spa_businesses set status = 'verified' where id = '00000000-0000-0000-0000-0000000000b1'$q$,
  1
);

select pg_temp.expect_denied(
  'moderator (staff, not superadmin) cannot set is_recommended — Phase 7 tightening',
  $q$update public.spa_businesses set is_recommended = true where id = '00000000-0000-0000-0000-0000000000b1'$q$
);

reset role;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a5', 'authenticated');

select pg_temp.expect_rows(
  'superadmin can set is_recommended',
  $q$update public.spa_businesses set is_recommended = true, recommended_by = '00000000-0000-0000-0000-0000000000a5', recommended_at = now() where id = '00000000-0000-0000-0000-0000000000b1'$q$,
  1
);
update public.spa_businesses set is_recommended = false, recommended_by = null, recommended_at = null
  where id = '00000000-0000-0000-0000-0000000000b1';

reset role;

-- =====================================================================
-- reviews / moderation_actions (0006)
-- =====================================================================
set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a1', 'authenticated');

select pg_temp.expect_rows(
  'review author can edit their own review',
  $q$update public.reviews set body = 'edited by author' where id = '00000000-0000-0000-0000-0000000000c1'$q$,
  1
);

select pg_temp.expect_denied(
  'review author cannot set their own moderation_status (guard trigger)',
  $q$update public.reviews set moderation_status = 'hidden' where id = '00000000-0000-0000-0000-0000000000c1'$q$
);

reset role;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a2', 'authenticated');

select pg_temp.expect_rows(
  'a different customer cannot edit someone else''s review (RLS filters the row)',
  $q$update public.reviews set body = 'hijacked' where id = '00000000-0000-0000-0000-0000000000c1'$q$,
  0
);

select pg_temp.expect_denied(
  'a non-staff customer cannot insert a moderation_actions row',
  $q$insert into public.moderation_actions (moderator_id, action_type, target_type, target_id, reason) values ('00000000-0000-0000-0000-0000000000a2', 'hide_content', 'review', '00000000-0000-0000-0000-0000000000c1', 'abuse')$q$
);

reset role;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a4', 'authenticated');

select pg_temp.expect_rows(
  'moderator can hide a review',
  $q$update public.reviews set moderation_status = 'hidden' where id = '00000000-0000-0000-0000-0000000000c1'$q$,
  1
);

select pg_temp.expect_rows(
  'moderator can log a moderation_actions row for their own action',
  $q$insert into public.moderation_actions (moderator_id, action_type, target_type, target_id, reason) values ('00000000-0000-0000-0000-0000000000a4', 'hide_content', 'review', '00000000-0000-0000-0000-0000000000c1', 'fixture reason')$q$,
  1
);

-- Capture the id while still authenticated as the moderator (a4), who can
-- actually SELECT it — moderation_actions_select is staff-only, so the
-- appeals block below (submitted by non-staff a1) cannot look this up
-- itself; it has to be handed the id directly, exactly like the real app
-- does (the actionId comes from a notification link, never a client-side
-- query against moderation_actions — see appeals/new/[actionId]/actions.ts).
create temporary table pg_temp.captured_moderation_action as
select id from public.moderation_actions
where target_id = '00000000-0000-0000-0000-0000000000c1'
  and moderator_id = '00000000-0000-0000-0000-0000000000a4'
order by created_at desc
limit 1;

select pg_temp.expect_rows(
  'moderation_actions has no update policy for anyone (RLS filters, 0 rows affected)',
  $q$update public.moderation_actions set reason = 'tampered' where target_id = '00000000-0000-0000-0000-0000000000c1'$q$,
  0
);

reset role;

-- moderation_actions must not be readable by non-staff (private queue).
set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a2', 'authenticated');

select pg_temp.assert(
  'a non-staff customer cannot see any moderation_actions rows',
  (select count(*) from public.moderation_actions) = 0
);

reset role;

-- =====================================================================
-- subscriptions / payment_events (0009) — billing derives is_premium,
-- never the reverse.
-- =====================================================================
insert into public.subscription_plans (id, slug, name, price_php, billing_cycle, is_active)
values ('00000000-0000-0000-0000-0000000000d1', 'rls-test-plan', 'RLS Test Plan', 500, 'monthly', true)
on conflict (slug) do nothing;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a3', 'authenticated');

select pg_temp.expect_denied(
  'owner cannot directly insert a subscriptions row (must go through the RPC — no insert policy exists)',
  $q$insert into public.subscriptions (business_id, plan_id, status) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'active')$q$
);

reset role;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a2', 'authenticated');

select pg_temp.assert(
  'a non-owner cannot read another business''s subscription rows',
  (select count(*) from public.subscriptions where business_id = '00000000-0000-0000-0000-0000000000b1') = 0
);
reset role;

-- =====================================================================
-- recommendation_records / featured_placements / appeals (0010)
-- =====================================================================
set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a4', 'authenticated');

select pg_temp.expect_denied(
  'moderator (not superadmin) cannot insert a recommendation_records row',
  $q$insert into public.recommendation_records (business_id, is_recommended, decided_by, criteria_notes) values ('00000000-0000-0000-0000-0000000000b1', true, '00000000-0000-0000-0000-0000000000a4', 'x')$q$
);

reset role;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a5', 'authenticated');

select pg_temp.expect_rows(
  'superadmin can insert a recommendation_records row',
  $q$insert into public.recommendation_records (business_id, is_recommended, decided_by, criteria_notes) values ('00000000-0000-0000-0000-0000000000b1', true, '00000000-0000-0000-0000-0000000000a5', 'fixture')$q$,
  1
);

reset role;

-- Appeals: a1's review was hidden above; a1 appeals it.
set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a1', 'authenticated');

do $$
declare
  v_action_id uuid;
  v_sql text;
begin
  select id into v_action_id from pg_temp.captured_moderation_action limit 1;
  v_sql := format(
    $f$insert into public.appeals (submitted_by, moderation_action_id, message) values ('00000000-0000-0000-0000-0000000000a1', %L, 'please reconsider')$f$,
    v_action_id
  );
  perform pg_temp.expect_rows(
    'a user can appeal a moderation action taken against their own content',
    v_sql,
    1
  );
end $$;

select pg_temp.expect_rows(
  'a non-staff appellant cannot resolve their own appeal (RLS filters the row)',
  $q$update public.appeals set status = 'overturned' where submitted_by = '00000000-0000-0000-0000-0000000000a1'$q$,
  0
);

reset role;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a2', 'authenticated');

select pg_temp.assert(
  'an unrelated customer cannot see another user''s appeal',
  (select count(*) from public.appeals where submitted_by = '00000000-0000-0000-0000-0000000000a1') = 0
);

reset role;

set local role authenticated;
select pg_temp.set_persona('00000000-0000-0000-0000-0000000000a4', 'authenticated');

select pg_temp.expect_rows(
  'a moderator can resolve an appeal',
  $q$update public.appeals set status = 'upheld', reviewed_by = '00000000-0000-0000-0000-0000000000a4', reviewed_at = now() where submitted_by = '00000000-0000-0000-0000-0000000000a1'$q$,
  1
);

reset role;

-- =====================================================================
-- anon (guest) boundary — no auth.uid() at all
-- =====================================================================
set local role anon;
select pg_temp.set_persona(null, 'anon');

select pg_temp.assert(
  'guest can read a verified listing',
  (select count(*) from public.spa_businesses where id = '00000000-0000-0000-0000-0000000000b1') = 1
);

select pg_temp.assert(
  'guest cannot see a review that a moderator hid (RLS filters on moderation_status)',
  (select count(*) from public.reviews where id = '00000000-0000-0000-0000-0000000000c1') = 0
);

select pg_temp.expect_denied(
  'guest cannot insert a review',
  $q$insert into public.reviews (business_id, customer_id, overall_rating, body) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 5, 'guest review')$q$
);

select pg_temp.assert(
  'guest cannot read moderation_actions',
  (select count(*) from public.moderation_actions) = 0
);

select pg_temp.assert(
  'guest cannot read audit_logs',
  (select count(*) from public.audit_logs) = 0
);

reset role;

-- =====================================================================
-- All assertions above either passed (printed a NOTICE) or the script
-- already aborted with a FAIL exception. Reaching here means every
-- check in this file passed.
-- =====================================================================
do $$ begin raise notice '=== RLS TEST SUITE: ALL ASSERTIONS PASSED ==='; end $$;

rollback;
