-- ============================================================
-- PART 1 - Idempotently finish the content_hash setup
-- ============================================================

-- 1.1 Hash function (re-create to ensure latest version)
CREATE OR REPLACE FUNCTION public.intrebare_content_hash(
  p_examen_id bigint,
  p_intrebare_text text,
  p_variante jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  norm_text text;
  norm_variante text;
BEGIN
  norm_text := trim(lower(regexp_replace(coalesce(p_intrebare_text, ''), '\s+', ' ', 'g')));

  SELECT string_agg(
           trim(lower(regexp_replace(elem, '\s+', ' ', 'g'))),
           '||' ORDER BY 1
         )
    INTO norm_variante
    FROM jsonb_array_elements_text(coalesce(p_variante, '[]'::jsonb)) AS elem;

  RETURN md5(
           coalesce(p_examen_id::text, '') || '|' ||
           norm_text || '|' ||
           coalesce(norm_variante, '')
         );
END;
$$;

GRANT EXECUTE ON FUNCTION public.intrebare_content_hash(bigint, text, jsonb) TO authenticated, anon;

-- 1.2 content_hash column
ALTER TABLE public.intrebari
  ADD COLUMN IF NOT EXISTS content_hash text;

-- 1.3 Trigger function + trigger
CREATE OR REPLACE FUNCTION public.intrebari_set_content_hash()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.content_hash := public.intrebare_content_hash(
    NEW.examen_id,
    NEW.intrebare_text,
    NEW.variante
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS intrebari_content_hash_trg ON public.intrebari;
CREATE TRIGGER intrebari_content_hash_trg
BEFORE INSERT OR UPDATE OF examen_id, intrebare_text, variante
ON public.intrebari
FOR EACH ROW
EXECUTE FUNCTION public.intrebari_set_content_hash();

-- 1.4 Backfill anything still missing a hash
UPDATE public.intrebari
   SET content_hash = public.intrebare_content_hash(examen_id, intrebare_text, variante)
 WHERE content_hash IS NULL;

-- 1.5 Safety check (will abort if true duplicates exist)
DO $$
DECLARE
  dup_count int;
BEGIN
  SELECT count(*) INTO dup_count
    FROM (
      SELECT content_hash
        FROM public.intrebari
       GROUP BY content_hash
      HAVING count(*) > 1
    ) d;

  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % duplicate content_hash group(s) found. '
      'Run: SELECT content_hash, count(*), array_agg(id) FROM intrebari '
      'GROUP BY content_hash HAVING count(*) > 1; then resolve manually.', dup_count;
  END IF;
END;
$$;

-- 1.6 Drop old constraint if it somehow still exists, then create the unique index
ALTER TABLE public.intrebari
  DROP CONSTRAINT IF EXISTS intrebare_unica_per_examen;

CREATE UNIQUE INDEX IF NOT EXISTS intrebari_content_hash_uidx
  ON public.intrebari (content_hash);

ALTER TABLE public.intrebari
  ALTER COLUMN content_hash SET NOT NULL;

-- 1.7 Preview RPC
CREATE OR REPLACE FUNCTION public.preview_intrebari_dedup(
  p_examen_id bigint,
  p_candidates jsonb
)
RETURNS TABLE (
  idx int,
  content_hash text,
  duplicate_in_db boolean,
  duplicate_in_batch boolean
)
LANGUAGE sql
STABLE
AS $$
  WITH candidates AS (
    SELECT
      (row_number() OVER ())::int - 1 AS idx,
      public.intrebare_content_hash(
        p_examen_id,
        elem->>'intrebare_text',
        elem->'variante'
      ) AS h
    FROM jsonb_array_elements(p_candidates) AS elem
  ),
  db_hits AS (
    SELECT DISTINCT i.content_hash AS h
      FROM public.intrebari i
     WHERE i.examen_id = p_examen_id
       AND i.content_hash IN (SELECT h FROM candidates)
  ),
  batch_dupes AS (
    SELECT h FROM candidates GROUP BY h HAVING count(*) > 1
  )
  SELECT
    c.idx,
    c.h AS content_hash,
    (c.h IN (SELECT h FROM db_hits)) AS duplicate_in_db,
    (c.h IN (SELECT h FROM batch_dupes)) AS duplicate_in_batch
  FROM candidates c
  ORDER BY c.idx;
$$;

GRANT EXECUTE ON FUNCTION public.preview_intrebari_dedup(bigint, jsonb) TO authenticated;

-- ============================================================
-- PART 2 - Write RLS policies for intrebari
-- ============================================================

-- Helper: is the current user a super_admin?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid()
       AND role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Helper: does the current org_admin own this exam?
CREATE OR REPLACE FUNCTION public.org_admin_owns_exam(p_examen_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
      JOIN public.examene e ON e.org_id = p.org_id
     WHERE p.id = auth.uid()
       AND p.role = 'org_admin'
       AND e.id = p_examen_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.org_admin_owns_exam(bigint) TO authenticated;

-- Drop any prior write policies we may have created in earlier attempts
DROP POLICY IF EXISTS "Super admin full access on intrebari" ON public.intrebari;
DROP POLICY IF EXISTS "Org admin manages intrebari in own org" ON public.intrebari;

-- Super admin: full ALL
CREATE POLICY "Super admin full access on intrebari"
  ON public.intrebari
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Org admin: ALL but only on exams belonging to their org
CREATE POLICY "Org admin manages intrebari in own org"
  ON public.intrebari
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (public.org_admin_owns_exam(examen_id))
  WITH CHECK (public.org_admin_owns_exam(examen_id));

-- Note: existing SELECT policies for authenticated and anon are left untouched.
-- Regular users still cannot INSERT/UPDATE/DELETE because no policy grants them that.
