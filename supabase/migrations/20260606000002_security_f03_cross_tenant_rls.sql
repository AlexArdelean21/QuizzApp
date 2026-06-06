-- ============================================================
-- F-03: Restrict examene and intrebari SELECT to own org only
-- ============================================================
--
-- ROOT CAUSE: examene had a "FOR SELECT USING (true)" policy for authenticated
-- users, and intrebari had BOTH an authenticated "USING (true)" SELECT policy and
-- an anon "USING (true)" SELECT policy — exposing every org's exams, questions and
-- correct answers to any logged-in (or anonymous) user.
--
-- IMPORTANT (this project's model):
--   * authorization column is `role` ('super_admin' | 'org_admin' | 'user')
--   * super_admin is global and MUST keep seeing all orgs, so each rewritten
--     SELECT policy includes an explicit super_admin clause. A pure
--     "org_id = my_org" policy would hide everything from super_admins
--     (whose org_id is NULL) and break the admin dashboards.
--   * regular users are further filtered to their `acces_examene` allocations
--     in application code (lib/quiz/fetch-random-intrebari.ts); org scoping here
--     only removes the cross-tenant leak without changing that behaviour.
--
-- The DO blocks below drop SELECT *and* ALL policies (ALL policies also grant
-- SELECT). The write (ALL) policies removed here are re-created as explicit,
-- role-checked write policies in migration 20260606000003.

-- ------------------------------------------------------------
-- examene
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE tablename = 'examene' AND schemaname = 'public'
      AND cmd IN ('SELECT', 'ALL')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.examene', r.policyname);
  END LOOP;
END $$;

-- New examene SELECT policy: super_admin sees all; everyone else only their org.
CREATE POLICY "examene_select_own_org"
  ON public.examene
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- ------------------------------------------------------------
-- intrebari
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE tablename = 'intrebari' AND schemaname = 'public'
      AND cmd IN ('SELECT', 'ALL')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.intrebari', r.policyname);
  END LOOP;
END $$;

-- New intrebari SELECT policy: questions are visible only for exams the caller
-- may see (own org), with super_admin seeing all. This also removes the previous
-- anonymous "read all questions + answers" exposure: anon has no auth.uid() and
-- therefore matches no row.
CREATE POLICY "intrebari_select_own_org"
  ON public.intrebari
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR examen_id IN (
      SELECT id FROM public.examene
      WHERE org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- organizatii (users should only see their own org; super_admin sees all)
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE tablename = 'organizatii' AND schemaname = 'public'
      AND cmd IN ('SELECT', 'ALL')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizatii', r.policyname);
  END LOOP;
END $$;

-- super_admin retains full management of organizations (was an ALL policy).
CREATE POLICY "organizatii_super_admin_all"
  ON public.organizatii
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "organizatii_select_own_org"
  ON public.organizatii
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Verify RLS is enabled on all three tables (idempotent).
ALTER TABLE public.examene     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intrebari   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizatii ENABLE ROW LEVEL SECURITY;
