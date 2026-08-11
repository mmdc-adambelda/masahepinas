-- Internal-only contact info for a business's real-world owner —
-- captured e.g. during bulk CSV import of sourced/scraped listings,
-- purely so staff can reach out about claiming the listing. Never
-- exposed publicly.
--
-- Deliberately a separate table, not columns on spa_businesses: RLS is
-- row-level, not column-level, and spa_businesses_select is public for
-- verified/unverified/pending_review rows — a plain `select *` from
-- spa_businesses would leak owner_name/phone/email to any visitor if
-- they lived there. Same reasoning as user_credibility_scores living
-- apart from profiles (see 0007_community.sql).
create table public.business_internal_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.spa_businesses (id) on delete cascade,
  owner_name text,
  owner_phone text,
  owner_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_internal_contacts_set_updated_at
  before update on public.business_internal_contacts
  for each row execute function public.set_updated_at();

alter table public.business_internal_contacts enable row level security;

create policy "business_internal_contacts_staff_only"
  on public.business_internal_contacts for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));
