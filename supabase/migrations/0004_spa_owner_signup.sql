-- Phase 2: spa owner registration path.
-- Extends handle_new_user (from 0001) so that when someone signs up via
-- the spa-owner form (raw_user_meta_data->>'intended_role' = 'spa_owner'),
-- they get the spa_owner role instead of customer, AND a draft
-- spa_businesses row is created atomically in the same trigger — the
-- owner fills in location/hours/services/images afterwards on
-- /submit-a-spa once they're signed in (see apps/web).

create or replace function public.slugify_business_name(name text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  intended_role text := new.raw_user_meta_data ->> 'intended_role';
  business_name text := new.raw_user_meta_data ->> 'business_name';
  business_contact text := new.raw_user_meta_data ->> 'business_contact_number';
  base_slug text;
  final_slug text;
begin
  insert into public.profiles (id, display_name, city, province)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'province'
  );

  if intended_role = 'spa_owner' and business_name is not null then
    insert into public.user_roles (user_id, role) values (new.id, 'spa_owner');

    base_slug := public.slugify_business_name(business_name);
    if base_slug = '' then
      base_slug := 'spa';
    end if;
    final_slug := base_slug;
    while exists (select 1 from public.spa_businesses where slug = final_slug) loop
      final_slug := base_slug || '-' || substr(md5(random()::text), 1, 5);
    end loop;

    insert into public.spa_businesses (
      slug, owner_id, business_name, contact_number, status
    ) values (
      final_slug, new.id, business_name, business_contact, 'pending_review'
    );
  else
    insert into public.user_roles (user_id, role) values (new.id, 'customer');
  end if;

  return new;
end;
$$;
