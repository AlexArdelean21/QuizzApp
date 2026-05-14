-- Drop the legacy "admin" role. The app now only recognises three roles:
--   * super_admin (platform-wide)
--   * org_admin   (scoped to a single organisation)
--   * user        (default)
--
-- This migration is defensive: it both remaps any leftover rows AND adds a
-- check constraint so future inserts cannot reintroduce the legacy value.

-- 1. Demote any leftover legacy admin rows. We map them to "user" so they
--    lose elevated privileges by default — a super_admin can re-promote
--    them deliberately to org_admin afterwards via /admin/global.
UPDATE public.profiles
SET role = 'user'
WHERE role = 'admin';

-- 2. Enforce the new role enumeration at the database layer. Using a check
--    constraint (rather than a native enum) keeps migrations simple and
--    avoids needing ALTER TYPE in production.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'org_admin', 'user'));
