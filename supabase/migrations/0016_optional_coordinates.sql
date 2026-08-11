-- Drops the NOT NULL constraint on business_locations.latitude/longitude.
-- Requested change: the bulk CSV importer should accept listings as-is,
-- without trying to geocode missing coordinates over the network (that
-- dependency was slow, rate-limited, and a source of crashes — see the
-- conversation this shipped from). A business can now have a location
-- row (address/city/province/region) with no pin at all; the app treats
-- that as "not shown on the map / excluded from distance search" rather
-- than blocking the import.
alter table public.business_locations alter column latitude drop not null;
alter table public.business_locations alter column longitude drop not null;
