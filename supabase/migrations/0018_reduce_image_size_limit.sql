-- Lower the business-images storage bucket's server-side file size cap
-- from 5 MB to 2 MB, matching packages/config's IMAGE_LIMITS.maxFileSizeBytes
-- (packages/config/index.ts). The app already validates this client- and
-- server-side (see uploadBusinessImage in apps/web/lib/business-image-actions.ts),
-- but Supabase Storage independently enforces its own per-bucket
-- file_size_limit, so both need to agree.
--
-- The bucket row already exists (created in 0003_spa_directory.sql), so
-- this is an update, not an insert-on-conflict.
update storage.buckets
set file_size_limit = 2097152 -- 2 MB
where id = 'business-images';
