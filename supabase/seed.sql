-- Local development seed data.
-- Intentionally empty in Phase 1 — there are no listings/reviews/service
-- categories yet (Phase 2+). Auth users cannot be safely created here
-- (password hashing goes through Supabase Auth, not raw SQL); instead:
--
--   1. Sign up a normal account through the app (creates a `customer` row
--      via the handle_new_user trigger).
--   2. Promote it to superadmin locally with:
--        insert into public.user_roles (user_id, role)
--        values ('<the user's auth.users id>', 'superadmin');
--
-- Phase 2: fictional Philippine spa listings for local development/testing
-- of search, filters, map discovery, and listing pages. Every business
-- name and description below is invented for development purposes only —
-- none of these are real establishments. All are admin-created
-- (owner_id null) and pre-verified so they're immediately visible in
-- search without a moderator step. Safe to re-run (ON CONFLICT DO NOTHING
-- on slug).

do $$
declare
  biz_id uuid;
begin
  -- 1. Makati, Metro Manila
  insert into public.spa_businesses (slug, business_name, description, status, is_premium, is_recommended, contact_number, price_range, gender_availability, average_rating, review_count)
  values ('serenity-leaf-spa-makati', 'Serenity Leaf Spa (fictional)', 'A fictional development listing: a calm, plant-filled day spa in the Makati CBD offering Swedish and deep tissue massage. Not a real business.', 'verified', true, true, '09171234567', 'premium', 'both', 4.8, 132)
  on conflict (slug) do nothing
  returning id into biz_id;
  if biz_id is not null then
    insert into public.business_locations (business_id, address_line, barangay, city_municipality, province, region, postal_code, latitude, longitude)
    values (biz_id, '123 Ayala Avenue', 'Bel-Air', 'Makati', 'Metro Manila', 'Metro Manila', '1209', 14.5547, 121.0244);
    insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_closed)
    select biz_id, d, '10:00', '22:00', false from generate_series(0, 6) d;
    insert into public.business_services (business_id, service_category_id, is_featured)
    select biz_id, id, slug in ('swedish-massage', 'deep-tissue-massage') from public.service_categories
    where slug in ('swedish-massage', 'deep-tissue-massage', 'aromatherapy-massage', 'facial-treatment');
  end if;

  -- 2. Quezon City, Metro Manila
  insert into public.spa_businesses (slug, business_name, description, status, is_premium, contact_number, price_range, gender_availability, average_rating, review_count)
  values ('bamboo-grove-wellness-qc', 'Bamboo Grove Wellness (fictional)', 'A fictional development listing: a neighborhood wellness center in Quezon City known for Thai massage and reflexology. Not a real business.', 'verified', false, '09181234567', 'mid_range', 'female_only', 4.5, 58)
  on conflict (slug) do nothing
  returning id into biz_id;
  if biz_id is not null then
    insert into public.business_locations (business_id, address_line, barangay, city_municipality, province, region, postal_code, latitude, longitude)
    values (biz_id, '45 Tomas Morato Avenue', 'South Triangle', 'Quezon City', 'Metro Manila', 'Metro Manila', '1103', 14.6367, 121.0341);
    insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_closed)
    select biz_id, d, '09:00', '21:00', false from generate_series(0, 6) d;
    insert into public.business_services (business_id, service_category_id, is_featured)
    select biz_id, id, slug = 'thai-massage' from public.service_categories
    where slug in ('thai-massage', 'reflexology');
  end if;

  -- 3. Cebu City, Cebu
  insert into public.spa_businesses (slug, business_name, description, status, is_recommended, contact_number, price_range, gender_availability, average_rating, review_count)
  values ('mango-tree-spa-cebu-city', 'Mango Tree Spa (fictional)', 'A fictional development listing: a resort-style spa near Cebu City offering hot stone massage and body scrubs. Not a real business.', 'verified', true, '09191234567', 'mid_range', 'no_preference', 4.7, 94)
  on conflict (slug) do nothing
  returning id into biz_id;
  if biz_id is not null then
    insert into public.business_locations (business_id, address_line, barangay, city_municipality, province, region, postal_code, latitude, longitude)
    values (biz_id, '78 Osmena Boulevard', 'Capitol Site', 'Cebu City', 'Cebu', 'Central Visayas', '6000', 10.3157, 123.8854);
    insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_closed)
    select biz_id, d, '10:00', '20:00', d = 1 from generate_series(0, 6) d; -- closed Mondays
    insert into public.business_services (business_id, service_category_id, is_featured)
    select biz_id, id, slug = 'hot-stone-massage' from public.service_categories
    where slug in ('hot-stone-massage', 'body-scrub', 'sauna');
  end if;

  -- 4. Mandaue, Cebu
  insert into public.spa_businesses (slug, business_name, description, status, contact_number, price_range, gender_availability, average_rating, review_count)
  values ('coastal-breeze-massage-mandaue', 'Coastal Breeze Massage (fictional)', 'A fictional development listing: a budget-friendly massage parlor in Mandaue popular with locals. Not a real business.', 'verified', '09201234567', 'budget', 'male_only', 4.2, 21)
  on conflict (slug) do nothing
  returning id into biz_id;
  if biz_id is not null then
    insert into public.business_locations (business_id, address_line, city_municipality, province, region, latitude, longitude)
    values (biz_id, '12 A.S. Fortuna Street', 'Mandaue City', 'Cebu', 'Central Visayas', 10.3236, 123.9226);
    insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_closed)
    select biz_id, d, '11:00', '23:00', false from generate_series(0, 6) d;
    insert into public.business_services (business_id, service_category_id, is_featured)
    select biz_id, id, false from public.service_categories where slug = 'swedish-massage';
  end if;

  -- 5. General Trias, Cavite
  insert into public.spa_businesses (slug, business_name, description, status, contact_number, price_range, gender_availability, average_rating, review_count)
  values ('palm-and-pine-spa-general-trias', 'Palm & Pine Spa (fictional)', 'A fictional development listing: a family-friendly spa in General Trias offering prenatal and sports massage. Not a real business.', 'pending_review', '09211234567', 'budget', 'both', 0, 0)
  on conflict (slug) do nothing
  returning id into biz_id;
  if biz_id is not null then
    insert into public.business_locations (business_id, address_line, city_municipality, province, region, latitude, longitude)
    values (biz_id, '9 Governors Drive', 'General Trias', 'Cavite', 'Calabarzon', 14.3833, 120.8817);
    insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_closed)
    select biz_id, d, '09:00', '19:00', d = 0 from generate_series(0, 6) d; -- closed Sundays
    insert into public.business_services (business_id, service_category_id, is_featured)
    select biz_id, id, slug = 'prenatal-massage' from public.service_categories
    where slug in ('prenatal-massage', 'sports-massage');
  end if;

  -- 6. Dasmariñas, Cavite
  insert into public.spa_businesses (slug, business_name, description, status, contact_number, price_range, gender_availability, average_rating, review_count)
  values ('golden-lotus-spa-dasmarinas', 'Golden Lotus Spa (fictional)', 'A fictional development listing: an upscale spa in Dasmarinas offering aromatherapy and facials. Not a real business.', 'unverified', '09221234567', 'luxury', 'female_only', 3.9, 12)
  on conflict (slug) do nothing
  returning id into biz_id;
  if biz_id is not null then
    insert into public.business_locations (business_id, address_line, city_municipality, province, region, latitude, longitude)
    values (biz_id, '5 Aguinaldo Highway', 'Dasmarinas', 'Cavite', 'Calabarzon', 14.3294, 120.9367);
    insert into public.business_hours (business_id, day_of_week, open_time, close_time, is_closed)
    select biz_id, d, '10:00', '20:00', false from generate_series(0, 6) d;
    insert into public.business_services (business_id, service_category_id, is_featured)
    select biz_id, id, slug = 'aromatherapy-massage' from public.service_categories
    where slug in ('aromatherapy-massage', 'facial-treatment');
  end if;
end $$;
