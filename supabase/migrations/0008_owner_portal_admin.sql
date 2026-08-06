-- Phase 5: Spa Owner Portal & Superadmin Admin Dashboard
-- analytics_events, spa_owners, business_claims, audit_logs; the business
-- claim approval workflow as SECURITY DEFINER RPCs (so a moderator, who
-- cannot write user_roles directly per docs/permissions.md, can still
-- complete a claim approval atomically); a private verification-documents
-- storage bucket. See docs/database-schema.md, docs/permissions.md,
-- docs/moderation-policy.md §6.

-- ---------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------
create type claim_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  business_id uuid references public.spa_businesses (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_business_idx on public.analytics_events (business_id, event_type);
create index analytics_events_created_idx on public.analytics_events (created_at);

-- Owner-facing extension of profiles for spa-owner-specific attestation
-- and verification data. Kept separate from `profiles` so customer
-- accounts never carry these columns. Verification document paths are
-- private (see storage policy below) — never exposed publicly.
create table public.spa_owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  full_name text,
  contact_number text,
  business_permit_reference text,
  government_registration_reference text,
  verification_document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger spa_owners_set_updated_at
  before update on public.spa_owners
  for each row execute function public.set_updated_at();

create table public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.spa_businesses (id) on delete cascade,
  claimant_user_id uuid not null references public.profiles (id) on delete cascade,
  status claim_status not null default 'pending',
  supporting_document_path text,
  notes text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index business_claims_one_pending_idx
  on public.business_claims (business_id, claimant_user_id)
  where status = 'pending';
create index business_claims_status_idx on public.business_claims (status);

create trigger business_claims_set_updated_at
  before update on public.business_claims
  for each row execute function public.set_updated_at();

-- Platform-wide immutable audit trail for superadmin/system-level actions
-- — distinct from `moderation_actions`, which is specifically content
-- moderation (see docs/database-schema.md).
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_state jsonb,
  new_state jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Business claim approval workflow. SECURITY DEFINER so a moderator (who
-- cannot write public.user_roles directly — that's superadmin-only, see
-- 0001's RLS) can still complete an approval atomically: reassign
-- ownership, grant the spa_owner role if missing, resolve the claim, and
-- log the action, all in one trusted transaction. Authorization is
-- enforced inside the function itself (is_staff check), not by the
-- caller's raw table privileges.
-- ---------------------------------------------------------------------
create or replace function public.approve_business_claim(claim_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  claim record;
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'Only staff can approve business claims';
  end if;

  select * into claim from public.business_claims where id = claim_id;
  if claim is null then
    raise exception 'Claim not found';
  end if;
  if claim.status <> 'pending' then
    raise exception 'Claim already resolved';
  end if;

  perform set_config('app.bypass_business_guard', 'true', true);
  update public.spa_businesses set owner_id = claim.claimant_user_id where id = claim.business_id;

  insert into public.user_roles (user_id, role, granted_by)
  values (claim.claimant_user_id, 'spa_owner', auth.uid())
  on conflict (user_id, role) do nothing;

  update public.business_claims
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), notes = reason
  where id = claim_id;

  insert into public.moderation_actions (moderator_id, action_type, target_type, target_id, reason)
  values (auth.uid(), 'approve_claim', 'business_claim', claim_id, reason);
end;
$$;

create or replace function public.reject_business_claim(claim_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  claim record;
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'Only staff can reject business claims';
  end if;

  select * into claim from public.business_claims where id = claim_id;
  if claim is null then
    raise exception 'Claim not found';
  end if;
  if claim.status <> 'pending' then
    raise exception 'Claim already resolved';
  end if;

  update public.business_claims
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), notes = reason
  where id = claim_id;

  insert into public.moderation_actions (moderator_id, action_type, target_type, target_id, reason)
  values (auth.uid(), 'reject_claim', 'business_claim', claim_id, reason);
end;
$$;

grant execute on function public.approve_business_claim to authenticated;
grant execute on function public.reject_business_claim to authenticated;

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------
alter table public.analytics_events enable row level security;
alter table public.spa_owners enable row level security;
alter table public.business_claims enable row level security;
alter table public.audit_logs enable row level security;

create policy "analytics_events_select"
  on public.analytics_events for select
  using (public.owns_business(business_id) or public.is_staff(auth.uid()));

create policy "analytics_events_insert"
  on public.analytics_events for insert
  with check (user_id is null or user_id = auth.uid());

create policy "spa_owners_select"
  on public.spa_owners for select
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "spa_owners_insert"
  on public.spa_owners for insert
  with check (user_id = auth.uid());

create policy "spa_owners_update"
  on public.spa_owners for update
  using (user_id = auth.uid() or public.is_staff(auth.uid()))
  with check (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "business_claims_select"
  on public.business_claims for select
  using (claimant_user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "business_claims_insert"
  on public.business_claims for insert
  with check (
    claimant_user_id = auth.uid()
    and exists (select 1 from public.spa_businesses b where b.id = business_id and b.owner_id is null)
  );

-- No client-facing update policy: claims are resolved exclusively via the
-- approve/reject_business_claim() functions above.

create policy "audit_logs_select"
  on public.audit_logs for select
  using (public.is_superadmin(auth.uid()));

create policy "audit_logs_insert"
  on public.audit_logs for insert
  with check (public.is_superadmin(auth.uid()) and actor_id = auth.uid());

-- ---------------------------------------------------------------------
-- Storage: verification documents (business permits, gov't registration).
-- Private — never publicly readable. Path convention:
-- verification-documents/{user_id}/{filename}.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents', 'verification-documents', false, 10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do nothing;

create policy "verification_documents_owner_read"
  on storage.objects for select
  using (
    bucket_id = 'verification-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff(auth.uid())
    )
  );

create policy "verification_documents_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "verification_documents_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'verification-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff(auth.uid())
    )
  );
