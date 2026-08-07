-- Adds enum values needed for the registration-approval feature. Split
-- into its own migration/transaction on purpose: PostgreSQL does not
-- allow a newly added enum value to be referenced (as a column default,
-- in an INSERT, etc.) within the same transaction that added it. Run
-- this migration first, let it commit, then run
-- 0013_registration_approval.sql, which is what actually uses these
-- values.

alter type account_status add value 'pending_approval';
alter type moderation_action_type add value 'approve_registration';
alter type moderation_action_type add value 'reject_registration';
