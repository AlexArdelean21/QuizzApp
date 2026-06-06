-- ============================================================
-- F-01 + F-02: Prevent self-modification of privileged fields
-- ============================================================
--
-- NOTE ON THIS PROJECT'S SCHEMA (read before editing):
--   public.profiles has TWO role columns:
--     * role -> the ACTIVE multi-tenant authorization column
--               (values: 'super_admin', 'org_admin', 'user').
--               This is what get_my_role()/is_super_admin()/admin-context.ts read.
--     * rol  -> a LEGACY column (values: 'student', 'super_admin') no longer used
--               for authorization, but still protected here for defense in depth.
--   org_id (uuid) and has_access_default_quiz (boolean) also exist.
--   All legitimate admin role/org changes already go through service-role
--   server actions (app/admin/actions.ts), which run as the PostgreSQL
--   `service_role` and therefore bypass both the REVOKE and the trigger below.

-- LAYER 1: Column-level privilege restriction.
--
-- IMPORTANT POSTGRES SUBTLETY: a column-level `REVOKE UPDATE (cols)` does NOT
-- subtract from an existing table-wide `GRANT UPDATE` — and in this project both
-- `authenticated` and `anon` hold a table-level UPDATE grant on profiles. So the
-- only way to restrict specific columns at the permission layer is to revoke the
-- table-wide UPDATE and then re-grant UPDATE on the allowed (non-sensitive)
-- columns only.
--
-- This strictly REDUCES privilege (both roles previously had full-table UPDATE),
-- so it cannot break any existing flow. All legitimate profile writes in the app
-- go through the service role (app/admin/actions.ts), which is unaffected. The
-- columns granted back (nume, email, streak_zile, ultima_activitate) cover the
-- intended "user edits own profile" self-service surface; the sensitive columns
-- (rol, role, org_id, has_access_default_quiz) become unwritable for
-- authenticated/anon at the PostgreSQL permission level, before RLS even runs.
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;

GRANT UPDATE (nume, email, streak_zile, ultima_activitate)
  ON public.profiles
  TO authenticated;

-- LAYER 2: Trigger enforcement (defense-in-depth).
-- Uses SECURITY INVOKER (default) so that `current_user` inside
-- the function correctly reflects the PostgreSQL role that issued
-- the UPDATE statement. PostgREST always does `SET ROLE authenticated`
-- or `SET ROLE service_role` based on the JWT before executing queries.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
-- No SECURITY DEFINER here — we WANT current_user to reflect the caller
AS $$
BEGIN
  -- Allow operations from service_role (server-side admin),
  -- postgres (direct DB access), and supabase internal roles.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- For all browser/client requests, block changes to sensitive fields.
  IF NEW.rol IS DISTINCT FROM OLD.rol THEN
    RAISE EXCEPTION 'Security: modification of "rol" is not permitted via direct table access.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Security: modification of "role" is not permitted via direct table access.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'Security: modification of "org_id" is not permitted via direct table access.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.has_access_default_quiz IS DISTINCT FROM OLD.has_access_default_quiz THEN
    RAISE EXCEPTION 'Security: modification of "has_access_default_quiz" is not permitted via direct table access.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger (idempotent)
DROP TRIGGER IF EXISTS enforce_profile_immutable_fields ON public.profiles;

CREATE TRIGGER enforce_profile_immutable_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

COMMENT ON FUNCTION public.prevent_profile_privilege_escalation() IS
  'SECURITY: Prevents authenticated/anon users from self-modifying privileged
   profile fields (rol, role, org_id, has_access_default_quiz). Service role and
   postgres bypass this check for legitimate admin operations.';

-- ============================================================
-- Admin RPCs for legitimate role / org changes.
--
-- These are SECURITY DEFINER and validate the CALLER via auth.uid()
-- (which stays pinned to the original JWT caller even inside a
-- SECURITY DEFINER function). They are adapted to THIS project's real
-- authorization model:
--   * the active authorization column is `role`
--   * valid roles are: 'user', 'org_admin', 'super_admin'
-- The existing app changes roles/org via service-role server actions; these
-- RPCs provide an equivalent, auditable, permission-checked entry point.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_target_user_id uuid,
  p_new_role       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_org  uuid;
  v_target_org  uuid;
BEGIN
  -- Validate new_role value whitelist (matches profiles_role_check constraint).
  IF p_new_role NOT IN ('user', 'org_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role value: %', p_new_role
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Get caller context.
  SELECT role, org_id INTO v_caller_role, v_caller_org
    FROM profiles WHERE id = auth.uid();

  -- Get target user's org.
  SELECT org_id INTO v_target_org
    FROM profiles WHERE id = p_target_user_id;

  -- Permission check: only super_admin or same-org org_admin can change roles.
  IF v_caller_role = 'super_admin' THEN
    -- super_admin can change anyone's role.
    NULL;
  ELSIF v_caller_role = 'org_admin' AND v_caller_org IS NOT NULL AND v_caller_org = v_target_org THEN
    -- org_admin can change roles within their org, but cannot grant super_admin.
    IF p_new_role = 'super_admin' THEN
      RAISE EXCEPTION 'Insufficient privileges to grant super_admin role'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSE
    RAISE EXCEPTION 'Insufficient privileges to change user roles'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE profiles SET role = p_new_role WHERE id = p_target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_org(
  p_target_user_id uuid,
  p_new_org_id     uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  -- Only super_admin can move users between orgs.
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Insufficient privileges to reassign user organization'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate target org exists.
  IF NOT EXISTS (SELECT 1 FROM organizatii WHERE id = p_new_org_id) THEN
    RAISE EXCEPTION 'Organization not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  UPDATE profiles SET org_id = p_new_org_id WHERE id = p_target_user_id;
END;
$$;

-- These RPCs intentionally do NOT grant EXECUTE to anon/authenticated by
-- default beyond Supabase's defaults; they are meant to be called from
-- server-side code using the service role. The internal auth.uid() check is
-- the authoritative gate regardless of caller role.
