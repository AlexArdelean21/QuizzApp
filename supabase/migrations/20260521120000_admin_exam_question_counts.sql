-- Aggregated question counts for the admin dashboard.
--
-- Replaces the N parallel `head: true count: exact` queries the admin route
-- used to fan out (one per exam) with a single GROUP BY round-trip. This is
-- the dominant DB cost on /admin once an organisation has dozens of exams.
--
-- The function only returns rows for exams that actually have at least one
-- question. The Node caller fills in zero for missing exam ids — it already
-- has the list of exam ids and treats "no row" as "0 questions".
--
-- Security: invoked exclusively through the service-role client in
-- `getAdminContext`-gated code paths, so we keep SECURITY INVOKER (no RLS
-- short-circuits) and rely on the existing admin-side authorization.

CREATE OR REPLACE FUNCTION public.admin_exam_question_counts(
  p_examen_ids integer[] DEFAULT NULL
)
RETURNS TABLE (examen_id integer, question_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT i.examen_id, COUNT(*)::bigint AS question_count
  FROM public.intrebari AS i
  WHERE p_examen_ids IS NULL
     OR i.examen_id = ANY(p_examen_ids)
  GROUP BY i.examen_id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_exam_question_counts(integer[])
  TO authenticated, service_role;
