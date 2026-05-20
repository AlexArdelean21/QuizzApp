-- Mastery + "Doar întrebări noi" support via DB-side queries.
--
-- These functions back two features that need set-based SQL rather than
-- multi-round-trip PostgREST queries:
--
--   * `user_latest_answers_for_exam` — DISTINCT ON the latest attempt per
--     question. Backs "Nivel de pregătire" so that mastery reflects only the
--     most recent answer (failing a previously-correct question drops the
--     score).
--   * `user_unattempted_intrebari` / `user_unattempted_intrebari_count` — a
--     LEFT JOIN between `intrebari` and `istoric_raspunsuri` filtered to
--     `intrebare_id IS NULL`. Backs the "Doar întrebări noi" practice mode.
--
-- All functions run with the caller's identity (SECURITY INVOKER), so RLS on
-- `istoric_raspunsuri` (own rows) and `intrebari` (accessible exams) keeps
-- multi-tenancy intact without extra `org_id` filters here — the question
-- pool is already partitioned by `examen_id`, which itself carries `org_id`.

CREATE OR REPLACE FUNCTION public.user_latest_answers_for_exam(
  p_user_id uuid,
  p_examen_id integer
)
RETURNS TABLE (intrebare_id integer, corect boolean, data_raspuns timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT DISTINCT ON (ir.intrebare_id)
    ir.intrebare_id,
    ir.corect,
    ir.data_raspuns
  FROM public.istoric_raspunsuri AS ir
  WHERE ir.user_id = p_user_id
    AND ir.examen_id = p_examen_id
    AND ir.intrebare_id IS NOT NULL
  ORDER BY ir.intrebare_id, ir.data_raspuns DESC NULLS LAST, ir.id DESC;
$$;

GRANT EXECUTE ON FUNCTION public.user_latest_answers_for_exam(uuid, integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.user_unattempted_intrebari(
  p_user_id uuid,
  p_examen_id integer
)
RETURNS SETOF public.intrebari
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT i.*
  FROM public.intrebari AS i
  LEFT JOIN public.istoric_raspunsuri AS ir
    ON ir.intrebare_id = i.id
   AND ir.user_id = p_user_id
  WHERE i.examen_id = p_examen_id
    AND ir.intrebare_id IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.user_unattempted_intrebari(uuid, integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.user_unattempted_intrebari_count(
  p_user_id uuid,
  p_examen_id integer
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT COUNT(*)::integer
  FROM public.intrebari AS i
  LEFT JOIN public.istoric_raspunsuri AS ir
    ON ir.intrebare_id = i.id
   AND ir.user_id = p_user_id
  WHERE i.examen_id = p_examen_id
    AND ir.intrebare_id IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.user_unattempted_intrebari_count(uuid, integer)
  TO authenticated;
