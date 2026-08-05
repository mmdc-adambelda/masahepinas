-- Phase 2: server-side search/filter/sort for the directory. Implemented as
-- a single SQL function (SECURITY INVOKER — the default — so it still runs
-- under the caller's RLS, not elevated privileges) rather than composed
-- client-side, because ranking needs a distance calculation (PostGIS) and a
-- multi-table service-name match that PostgREST's query builder can't
-- express cleanly. See docs/product-requirements.md §8 "Search Sorting".

create or replace function public.search_spa_businesses(
  search_query text default null,
  filter_region text default null,
  filter_province text default null,
  filter_city text default null,
  filter_service_slug text default null,
  filter_gender gender_availability default null,
  filter_price price_range default null,
  filter_verified_only boolean default false,
  filter_premium_only boolean default false,
  filter_recommended_only boolean default false,
  filter_min_rating numeric default null,
  user_lat double precision default null,
  user_lng double precision default null,
  radius_km double precision default null,
  sort_by text default 'relevance',
  page_number integer default 1,
  page_size integer default 20
)
returns table (
  id uuid,
  slug text,
  business_name text,
  description text,
  status listing_status,
  is_premium boolean,
  is_recommended boolean,
  gender_availability gender_availability,
  price_range price_range,
  average_rating numeric,
  review_count integer,
  city_municipality text,
  province text,
  region text,
  latitude double precision,
  longitude double precision,
  primary_image_path text,
  distance_km double precision,
  total_count bigint
)
language sql
stable
as $$
  with filtered as (
    select
      b.id, b.slug, b.business_name, b.description, b.status, b.is_premium,
      b.is_recommended, b.gender_availability, b.price_range, b.average_rating,
      b.review_count, l.city_municipality, l.province, l.region, l.latitude, l.longitude,
      (
        select bi.storage_path from public.business_images bi
        where bi.business_id = b.id
        order by bi.is_primary desc, bi.position asc
        limit 1
      ) as primary_image_path,
      case
        when user_lat is not null and user_lng is not null then
          st_distance(l.geom, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) / 1000.0
        else null
      end as distance_km
    from public.spa_businesses b
    join public.business_locations l on l.business_id = b.id
    where b.deleted_at is null
      and b.status in ('verified', 'unverified', 'pending_review')
      and (
        search_query is null or search_query = '' or (
          b.business_name ilike '%' || search_query || '%'
          or l.address_line ilike '%' || search_query || '%'
          or l.city_municipality ilike '%' || search_query || '%'
          or l.province ilike '%' || search_query || '%'
          or exists (
            select 1 from public.business_services bs
            join public.service_categories sc on sc.id = bs.service_category_id
            where bs.business_id = b.id and sc.name ilike '%' || search_query || '%'
          )
        )
      )
      and (filter_region is null or l.region = filter_region)
      and (filter_province is null or l.province = filter_province)
      and (filter_city is null or l.city_municipality = filter_city)
      and (
        filter_gender is null
        or b.gender_availability = filter_gender
        or b.gender_availability = 'both'
      )
      and (filter_price is null or b.price_range = filter_price)
      and (not filter_verified_only or b.status = 'verified')
      and (not filter_premium_only or b.is_premium)
      and (not filter_recommended_only or b.is_recommended)
      and (filter_min_rating is null or b.average_rating >= filter_min_rating)
      and (
        filter_service_slug is null or exists (
          select 1 from public.business_services bs
          join public.service_categories sc on sc.id = bs.service_category_id
          where bs.business_id = b.id and sc.slug = filter_service_slug
        )
      )
      and (
        radius_km is null or user_lat is null or user_lng is null
        or st_dwithin(
          l.geom,
          st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography,
          radius_km * 1000
        )
      )
  ),
  counted as (
    select *, count(*) over () as total_count from filtered
  )
  select * from counted
  order by
    case when sort_by = 'rating' then average_rating end desc nulls last,
    case when sort_by = 'most_reviewed' then review_count end desc nulls last,
    case when sort_by = 'distance' then distance_km end asc nulls last,
    is_premium desc,
    is_recommended desc,
    average_rating desc,
    review_count desc
  limit page_size offset (page_number - 1) * page_size;
$$;

grant execute on function public.search_spa_businesses to anon, authenticated;
