-- Phase 6: Premium Subscription
-- subscription_plans, subscriptions, payment_events; test-mode checkout/
-- cancel as SECURITY DEFINER RPCs; a trigger that keeps
-- spa_businesses.is_premium in sync with subscription status (never
-- client-settable directly — see docs/permissions.md "Mark own business
-- premium: not allowed"). See docs/database-schema.md,
-- docs/product-requirements.md §6.

-- ---------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------
create type subscription_status as enum ('trial', 'active', 'past_due', 'cancelled', 'expired');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  price_php numeric(10, 2) not null,
  billing_cycle text not null default 'monthly',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscription_plans_set_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

-- One evolving subscription record per business (matches how real payment
-- providers model it — a subscription's status transitions over time,
-- rather than one row per billing period). Full history lives in
-- payment_events below.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.spa_businesses (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  status subscription_status not null default 'trial',
  provider_name text not null default 'test_mode',
  provider_reference_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Append-only payment ledger. provider_event_id is unique so replaying the
-- same webhook/simulated event twice is a no-op (docs/product-
-- requirements.md §6 "Payment events are idempotent").
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  provider_event_id text unique not null,
  event_type text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create index payment_events_subscription_idx on public.payment_events (subscription_id);

-- ---------------------------------------------------------------------
-- Keep spa_businesses.is_premium in sync with subscription status. Runs
-- regardless of which code path changed the subscription (the RPCs below,
-- a future real webhook handler, or a staff correction), so "is_premium"
-- is always derived, never independently settable.
-- ---------------------------------------------------------------------
create or replace function public.sync_business_premium_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_business_guard', 'true', true);
  update public.spa_businesses
  set is_premium = (new.status in ('trial', 'active'))
  where id = new.business_id;
  return new;
end;
$$;

create trigger subscriptions_sync_premium
  after insert or update of status on public.subscriptions
  for each row execute function public.sync_business_premium_flag();

-- ---------------------------------------------------------------------
-- Test-mode checkout/cancel. Real payment provider integration (Phase 6
-- backlog item, see docs/architecture.md §7) would call these same RPCs
-- from a webhook handler instead of directly from the client — the
-- interface is provider-agnostic on purpose.
-- ---------------------------------------------------------------------
create or replace function public.start_premium_subscription(target_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_id_var uuid;
  sub_id uuid;
begin
  if not (public.owns_business(target_business_id) or public.is_staff(auth.uid())) then
    raise exception 'Only the business owner or staff can manage this subscription';
  end if;

  select id into plan_id_var from public.subscription_plans
  where slug = 'premium-monthly' and is_active
  limit 1;
  if plan_id_var is null then
    raise exception 'Premium plan is not configured';
  end if;

  insert into public.subscriptions (
    business_id, plan_id, status, provider_name,
    current_period_start, current_period_end, cancel_at_period_end
  )
  values (
    target_business_id, plan_id_var, 'active', 'test_mode',
    now(), now() + interval '30 days', false
  )
  on conflict (business_id) do update set
    plan_id = excluded.plan_id,
    status = 'active',
    current_period_start = now(),
    current_period_end = now() + interval '30 days',
    cancel_at_period_end = false
  returning id into sub_id;

  insert into public.payment_events (subscription_id, provider_event_id, event_type, raw_payload)
  values (
    sub_id,
    'test_payment_' || sub_id::text || '_' || extract(epoch from now())::bigint::text,
    'payment_succeeded',
    jsonb_build_object('simulated', true, 'amount_php', 500)
  )
  on conflict (provider_event_id) do nothing;
end;
$$;

create or replace function public.cancel_premium_subscription(target_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sub_id uuid;
begin
  if not (public.owns_business(target_business_id) or public.is_staff(auth.uid())) then
    raise exception 'Only the business owner or staff can manage this subscription';
  end if;

  update public.subscriptions
  set status = 'cancelled', cancel_at_period_end = true
  where business_id = target_business_id
  returning id into sub_id;

  if sub_id is null then
    raise exception 'No subscription found for this business';
  end if;

  insert into public.payment_events (subscription_id, provider_event_id, event_type, raw_payload)
  values (
    sub_id,
    'test_cancel_' || sub_id::text || '_' || extract(epoch from now())::bigint::text,
    'subscription_cancelled',
    jsonb_build_object('simulated', true)
  )
  on conflict (provider_event_id) do nothing;
end;
$$;

grant execute on function public.start_premium_subscription to authenticated;
grant execute on function public.cancel_premium_subscription to authenticated;

-- ---------------------------------------------------------------------
-- Expiration sweep — flips subscriptions whose period has lapsed (either
-- cancelled-at-period-end, or a lapsed payment) to 'expired', which the
-- sync trigger above automatically turns into is_premium = false. Callable
-- by staff from /admin, and by pg_cron if available on this project (the
-- schedule call is wrapped so migration succeeds even if pg_cron isn't
-- enabled on this Supabase plan).
-- ---------------------------------------------------------------------
create or replace function public.expire_due_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.subscriptions
  set status = 'expired'
  where status in ('active', 'past_due')
    and current_period_end is not null
    and current_period_end < now()
    and (cancel_at_period_end or status = 'past_due');
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.expire_due_subscriptions to authenticated;

do $$
begin
  perform cron.schedule('expire-due-subscriptions', '0 * * * *', 'select public.expire_due_subscriptions();');
exception
  when undefined_function or invalid_schema_name or undefined_table then
    raise notice 'pg_cron not available on this project — call public.expire_due_subscriptions() manually or from /admin instead.';
end $$;

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;

create policy "subscription_plans_select"
  on public.subscription_plans for select
  using (true);

create policy "subscription_plans_write_superadmin"
  on public.subscription_plans for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

create policy "subscriptions_select"
  on public.subscriptions for select
  using (public.owns_business(business_id) or public.is_staff(auth.uid()));

-- No client-facing insert/update policy: subscriptions are only ever
-- written by the RPCs above (SECURITY DEFINER, authorization checked
-- internally) or a future real payment-provider webhook handler.

create policy "payment_events_select"
  on public.payment_events for select
  using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id
        and (public.owns_business(s.business_id) or public.is_staff(auth.uid()))
    )
  );

-- ---------------------------------------------------------------------
-- Seed: the one MVP plan.
-- ---------------------------------------------------------------------
insert into public.subscription_plans (slug, name, price_php, billing_cycle)
values ('premium-monthly', 'Masahe Pinas Premium', 500.00, 'monthly')
on conflict (slug) do nothing;
