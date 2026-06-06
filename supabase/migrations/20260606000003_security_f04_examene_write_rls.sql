-- ============================================================
-- F-04: Restrict examene + intrebari writes to privileged roles
-- ============================================================
--
-- Students (role = 'user') must not be able to INSERT/UPDATE/DELETE exams or
-- questions. Only org_admins (within their own org) and super_admins (globally)
-- may write.
--
-- IMPORTANT (this project's model):
--   * The authorization column is `role`, with values
--     'super_admin' | 'org_admin' | 'user'.
--   * The spec's role whitelist ('admin','profesor','teacher','owner') does NOT
--     exist in this database — using it verbatim would block EVERY writer,
--     including admins. We therefore enforce the real privileged set:
--         role = 'super_admin'  -> global write
--         role = 'org_admin'    -> write within own org only
--   * In normal operation, exam/question writes flow through service-role server
--     actions (app/admin/actions.ts) which bypass RLS. These policies are the
--     defense-in-depth layer that blocks direct PostgREST writes from a user JWT.
--
-- Run order: 001 -> 002 -> 003. Until `role` is write-protected (migration 001),
-- a student could escalate first and then pass these checks.

-- ------------------------------------------------------------
-- examene write policies
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE tablename = 'examene' AND schemaname = 'public'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.examene', r.policyname);
  END LOOP;
END $$;

-- examene INSERT
CREATE POLICY "examene_insert_privileged_only"
  ON public.examene
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
      AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- examene UPDATE
CREATE POLICY "examene_update_privileged_only"
  ON public.examene
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
      AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
      AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- examene DELETE
CREATE POLICY "examene_delete_privileged_only"
  ON public.examene
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
      AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- intrebari write policies
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE tablename = 'intrebari' AND schemaname = 'public'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.intrebari', r.policyname);
  END LOOP;
END $$;

-- intrebari INSERT
CREATE POLICY "intrebari_insert_privileged_only"
  ON public.intrebari
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
      AND examen_id IN (
        SELECT id FROM public.examene
        WHERE org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

-- intrebari UPDATE
CREATE POLICY "intrebari_update_privileged_only"
  ON public.intrebari
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
      AND examen_id IN (
        SELECT id FROM public.examene
        WHERE org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
      AND examen_id IN (
        SELECT id FROM public.examene
        WHERE org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

-- intrebari DELETE
CREATE POLICY "intrebari_delete_privileged_only"
  ON public.intrebari
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
      AND examen_id IN (
        SELECT id FROM public.examene
        WHERE org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );
