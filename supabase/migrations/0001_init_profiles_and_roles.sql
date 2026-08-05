-- Phase 1: Project Foundation
-- Creates profiles + user_roles, the handle_new_user trigger that keeps
-- them in sync with auth.users on signup, and baseline RLS policies.
-- See docs/database-schema.md and docs/permissions.md for the full plan.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type app_role as enum ('customer', 'spa_owner', 'moderator', 'superadmin');
create type account_status as enum ('active', 'suspended');

-- ---------------------------------------------------------------------
-- updated_at trigger helper (reused by every future table)
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Tables (created before any RLS policy so cross-table policy checks
-- below can reference either table regardless of definition order).
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 500),
  city text,
  province text,
  is_private boolean not null default false,
  credibility_score numeric,
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index profiles_status_idx on public.profiles (status);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role app_role not null,
  granted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index user_roles_user_id_idx on public.user_roles (user_id);

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- profiles: public can see non-deleted profiles (private-field filtering
-- happens at the query/view layer once follower/review counts exist in
-- later phases). Inserts happen only via the handle_new_user trigger
-- below — no client-facing insert policy is granted.
create policy "profiles_select_public"
  on public.profiles for select
  using (deleted_at is null);

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_update_staff"
  on public.profiles for update
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('moderator', 'superadmin')
    )
  );

-- user_roles: a user can see their own roles; staff can see everyone's.
-- Only a superadmin can grant/revoke roles.
create policy "user_roles_select_self_or_staff"
  on public.user_roles for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('moderator', 'superadmin')
    )
  );

create policy "user_roles_write_superadmin_only"
  on public.user_roles for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'superadmin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'superadmin'
    )
  );

-- ---------------------------------------------------------------------
-- handle_new_user: atomically creates a profile + default customer role
-- whenever a new auth.users row is inserted (i.e. on sign-up). Runs as
-- security definer so it can bypass RLS for this one controlled insert
-- path — this is the ONLY way profiles/user_roles rows get created from
-- client-driven signups (see docs/permissions.md).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, city, province)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'province'
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
