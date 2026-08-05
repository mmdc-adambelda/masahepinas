-- Phase 2: Spa Directory & Location Discovery
-- service_categories, spa_businesses, business_locations, business_hours,
-- business_services, business_images, saved_businesses + RLS + storage.
-- See docs/database-schema.md and docs/permissions.md.

create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type listing_status as enum (
  'pending_review', 'verified', 'unverified', 'suspended', 'archived'
);
create type gender_availability as enum (
  'male_only', 'female_only', 'both', 'no_preference'
);
create type price_range as enum ('budget', 'mid_range', 'premium', 'luxury');

-- ---------------------------------------------------------------------
-- Role-check helper, general form (0002 already added is_staff/is_superadmin
-- for the two roles that recur constantly; this covers the rest, e.g.
-- 'spa_owner', without repeating the recursion mistake from 0001).
-- ---------------------------------------------------------------------
create or replace function public.has_role(uid uuid, check_role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role = check_role
  );
$$;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger service_categories_set_updated_at
  before update on public.service_categories
  for each row execute function public.set_updated_at();

create table public.spa_businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  owner_id uuid references public.profiles (id) on delete set null,
  business_name text not null check (char_length(business_name) between 2 and 150),
  description text,
  logo_image_id uuid, -- FK to business_images added after that table exists
  status listing_status not null default 'pending_review',
  is_premium boolean not null default false,
  is_recommended boolean not null default false,
  recommended_by uuid references public.profiles (id),
  recommended_at timestamptz,
  contact_number text,
  booking_contact_number text,
  website_url text,
  social_media_url text,
  price_range price_range,
  gender_availability gender_availability not null default 'no_preference',
  average_rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  verified_review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index spa_businesses_status_idx on public.spa_businesses (status);
create index spa_businesses_owner_idx on public.spa_businesses (owner_id);
create index spa_businesses_name_trgm_idx
  on public.spa_businesses using gin (business_name gin_trgm_ops);

create trigger spa_businesses_set_updated_at
  before update on public.spa_businesses
  for each row execute function public.set_updated_at();

create table public.business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.spa_businesses (id) on delete cascade,
  address_line text not null,
  barangay text,
  city_municipality text not null,
  province text not null,
  region text not null,
  postal_code text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  geom geography(point, 4326)
    generated always as (
      st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
    ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_locations_geom_idx on public.business_locations using gist (geom);
create index business_locations_city_idx
  on public.business_locations (province, city_municipality);
create index business_locations_city_trgm_idx
  on public.business_locations using gin (city_municipality gin_trgm_ops);
create index business_locations_address_trgm_idx
  on public.business_locations using gin (address_line gin_trgm_ops);

create trigger business_locations_set_updated_at
  before update on public.business_locations
  for each row execute function public.set_updated_at();

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.spa_businesses (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (business_id, day_of_week)
);

create trigger business_hours_set_updated_at
  before update on public.business_hours
  for each row execute function public.set_updated_at();

create table public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.spa_businesses (id) on delete cascade,
  service_category_id uuid not null references public.service_categories (id),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  unique (business_id, service_category_id)
);

create index business_services_business_idx on public.business_services (business_id);
create index business_services_category_idx on public.business_services (service_category_id);

create table public.business_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.spa_businesses (id) on delete cascade,
  storage_path text not null,
  caption text,
  alt_text text,
  is_primary boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index business_images_business_idx on public.business_images (business_id);
create unique index business_images_one_primary_idx
  on public.business_images (business_id) where is_primary;

alter table public.spa_businesses
  add constraint spa_businesses_logo_image_fkey
  foreign key (logo_image_id) references public.business_images (id) on delete set null;

create table public.saved_businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.spa_businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, business_id)
);

create index saved_businesses_user_idx on public.saved_businesses (user_id);

-- ---------------------------------------------------------------------
-- Guardrails enforced in the database (not just app code), matching the
-- negative constraints in docs/permissions.md: an owner can never grant
-- themselves premium/recommended status, change moderation status, or
-- reassign ownership — only staff (or the service role, for billing/
-- moderation automation) can touch those columns.
-- ---------------------------------------------------------------------
create or replace function public.enforce_business_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff(auth.uid()) then
    if new.is_premium is distinct from old.is_premium
      or new.is_recommended is distinct from old.is_recommended
      or new.recommended_by is distinct from old.recommended_by
      or new.recommended_at is distinct from old.recommended_at
      or new.status is distinct from old.status
      or new.owner_id is distinct from old.owner_id
      or new.average_rating is distinct from old.average_rating
      or new.review_count is distinct from old.review_count
      or new.verified_review_count is distinct from old.verified_review_count
    then
      raise exception 'Only staff can modify protected business fields';
    end if;
  end if;
  return new;
end;
$$;

create trigger spa_businesses_update_guard
  before update on public.spa_businesses
  for each row execute function public.enforce_business_update_guard();

create or replace function public.enforce_business_image_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  img_count integer;
begin
  select count(*) into img_count
  from public.business_images
  where business_id = new.business_id;

  if img_count >= 3 then
    raise exception 'A business can have at most 3 images';
  end if;

  return new;
end;
$$;

create trigger business_images_limit_guard
  before insert on public.business_images
  for each row execute function public.enforce_business_image_limit();

-- ---------------------------------------------------------------------
-- Ownership helper
-- ---------------------------------------------------------------------
create or replace function public.owns_business(biz_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.spa_businesses
    where id = biz_id and owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------
alter table public.service_categories enable row level security;
alter table public.spa_businesses enable row level security;
alter table public.business_locations enable row level security;
alter table public.business_hours enable row level security;
alter table public.business_services enable row level security;
alter table public.business_images enable row level security;
alter table public.saved_businesses enable row level security;

-- service_categories: public read of active categories (staff sees all);
-- only superadmin manages the catalog.
create policy "service_categories_select"
  on public.service_categories for select
  using (is_active or public.is_staff(auth.uid()));

create policy "service_categories_write_superadmin"
  on public.service_categories for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

-- spa_businesses
create policy "spa_businesses_select"
  on public.spa_businesses for select
  using (
    (deleted_at is null and status in ('verified', 'unverified', 'pending_review'))
    or owner_id = auth.uid()
    or public.is_staff(auth.uid())
  );

create policy "spa_businesses_insert"
  on public.spa_businesses for insert
  with check (
    (public.has_role(auth.uid(), 'spa_owner') and owner_id = auth.uid())
    or public.is_superadmin(auth.uid())
  );

create policy "spa_businesses_update"
  on public.spa_businesses for update
  using (owner_id = auth.uid() or public.is_staff(auth.uid()))
  with check (owner_id = auth.uid() or public.is_staff(auth.uid()));

-- business_locations / business_hours / business_services / business_images
-- all follow the same shape: visible wherever the parent business is
-- visible; writable by the business owner or staff.
create policy "business_locations_select"
  on public.business_locations for select
  using (
    exists (
      select 1 from public.spa_businesses b
      where b.id = business_id
        and (
          (b.deleted_at is null and b.status in ('verified', 'unverified', 'pending_review'))
          or b.owner_id = auth.uid()
          or public.is_staff(auth.uid())
        )
    )
  );
create policy "business_locations_write"
  on public.business_locations for all
  using (public.owns_business(business_id) or public.is_staff(auth.uid()))
  with check (public.owns_business(business_id) or public.is_staff(auth.uid()));

create policy "business_hours_select"
  on public.business_hours for select
  using (
    exists (
      select 1 from public.spa_businesses b
      where b.id = business_id
        and (
          (b.deleted_at is null and b.status in ('verified', 'unverified', 'pending_review'))
          or b.owner_id = auth.uid()
          or public.is_staff(auth.uid())
        )
    )
  );
create policy "business_hours_write"
  on public.business_hours for all
  using (public.owns_business(business_id) or public.is_staff(auth.uid()))
  with check (public.owns_business(business_id) or public.is_staff(auth.uid()));

create policy "business_services_select"
  on public.business_services for select
  using (
    exists (
      select 1 from public.spa_businesses b
      where b.id = business_id
        and (
          (b.deleted_at is null and b.status in ('verified', 'unverified', 'pending_review'))
          or b.owner_id = auth.uid()
          or public.is_staff(auth.uid())
        )
    )
  );
create policy "business_services_write"
  on public.business_services for all
  using (public.owns_business(business_id) or public.is_staff(auth.uid()))
  with check (public.owns_business(business_id) or public.is_staff(auth.uid()));

create policy "business_images_select"
  on public.business_images for select
  using (
    exists (
      select 1 from public.spa_businesses b
      where b.id = business_id
        and (
          (b.deleted_at is null and b.status in ('verified', 'unverified', 'pending_review'))
          or b.owner_id = auth.uid()
          or public.is_staff(auth.uid())
        )
    )
  );
create policy "business_images_write"
  on public.business_images for all
  using (public.owns_business(business_id) or public.is_staff(auth.uid()))
  with check (public.owns_business(business_id) or public.is_staff(auth.uid()));

-- saved_businesses: fully private to the saving user.
create policy "saved_businesses_select"
  on public.saved_businesses for select
  using (user_id = auth.uid());
create policy "saved_businesses_insert"
  on public.saved_businesses for insert
  with check (user_id = auth.uid());
create policy "saved_businesses_delete"
  on public.saved_businesses for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Storage: business listing images. Public read; writes restricted to the
-- owning business (path convention: business-images/{business_id}/{file}).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-images', 'business-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "business_images_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'business-images');

create policy "business_images_storage_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'business-images'
    and (
      public.owns_business((storage.foldername(name))[1]::uuid)
      or public.is_staff(auth.uid())
    )
  );

create policy "business_images_storage_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'business-images'
    and (
      public.owns_business((storage.foldername(name))[1]::uuid)
      or public.is_staff(auth.uid())
    )
  );

create policy "business_images_storage_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'business-images'
    and (
      public.owns_business((storage.foldername(name))[1]::uuid)
      or public.is_staff(auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- Seed: service category catalog (superadmin-managed; safe to seed here
-- since it's platform configuration, not fictional business data).
-- ---------------------------------------------------------------------
insert into public.service_categories (slug, name, description) values
  ('swedish-massage', 'Swedish Massage', 'Gentle, relaxing full-body massage using long strokes.'),
  ('deep-tissue-massage', 'Deep Tissue Massage', 'Targets deeper muscle layers to relieve chronic tension.'),
  ('thai-massage', 'Thai Massage', 'Assisted stretching and rhythmic pressure, done fully clothed.'),
  ('shiatsu-massage', 'Shiatsu Massage', 'Japanese finger-pressure technique along the body''s energy lines.'),
  ('reflexology', 'Reflexology', 'Targeted pressure on the feet, hands, or ears.'),
  ('hot-stone-massage', 'Hot Stone Massage', 'Heated smooth stones used to warm and relax muscles.'),
  ('prenatal-massage', 'Prenatal Massage', 'Massage adapted for expecting mothers.'),
  ('sports-massage', 'Sports Massage', 'Focused on athletic recovery and performance.'),
  ('aromatherapy-massage', 'Aromatherapy Massage', 'Massage combined with essential oils.'),
  ('body-scrub', 'Body Scrub', 'Full-body exfoliating treatment.'),
  ('sauna', 'Sauna', 'Dry or steam heat therapy session.'),
  ('facial-treatment', 'Facial Treatment', 'Cleansing and rejuvenating facial care.')
on conflict (slug) do nothing;
