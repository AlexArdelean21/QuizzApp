-- ============================================================
-- PART 1 -- Performance indexes
-- ============================================================
-- These support the aggregation patterns below. CONCURRENTLY is omitted
-- because Supabase migrations run in a transaction; that's fine for our scale.

CREATE INDEX IF NOT EXISTS idx_sesiuni_simulare_user_examen_final
  ON public.sesiuni_simulare (user_id, examen_id)
  WHERE finalizat = true OR timed_out = true;

CREATE INDEX IF NOT EXISTS idx_sesiuni_practica_user_examen
  ON public.sesiuni_practica (user_id, examen_id);

CREATE INDEX IF NOT EXISTS idx_status_invatare_user_examen_gresita
  ON public.status_invatare (user_id, examen_id)
  WHERE este_gresita = true;

CREATE INDEX IF NOT EXISTS idx_istoric_raspunsuri_user_examen_corect
  ON public.istoric_raspunsuri (user_id, examen_id, corect);

CREATE INDEX IF NOT EXISTS idx_acces_examene_user_examen
  ON public.acces_examene (user_id, examen_id);

CREATE INDEX IF NOT EXISTS idx_profiles_org_role
  ON public.profiles (org_id, role);


-- ============================================================
-- PART 2 -- Helper: authorization check used by all three RPCs
-- ============================================================
-- Returns true if the current auth.uid() may view stats for the given org_id.
-- super_admin -> always true (org_id ignored)
-- org_admin   -> true only if profiles.org_id matches
-- everyone else -> false

CREATE OR REPLACE FUNCTION public.can_view_org_stats(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE p.id = auth.uid()
       AND (
         p.role = 'super_admin'
         OR (p.role = 'org_admin' AND p.org_id = p_org_id)
       )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_view_org_stats(uuid) TO authenticated;


-- ============================================================
-- PART 3 -- RPC: get_org_students_stats
-- ============================================================
-- Returns the paginated list of students in an organization with aggregated metrics
-- for ONE specific exam. Designed to power the /dashboard/admin/elevi page.
--
-- Parameters:
--   p_org_id     -- required. Org to filter on. For super_admin, the page passes whichever
--                  org_id is currently selected in the dropdown. RPC always enforces it.
--   p_examen_id  -- required. Filter all metrics on this exam.
--   p_search     -- optional. ILIKE match on name/email.
--   p_sort       -- optional. One of: 'nume_asc', 'nume_desc', 'scor_desc', 'scor_asc',
--                  'simulari_desc', 'ultima_activitate_desc'. Default: 'nume_asc'.
--   p_limit      -- default 25.
--   p_offset     -- default 0.
--
-- Returns one row per student in that org, including students with zero activity on the
-- selected exam (their numeric columns will be NULL/0).
--
-- Authorization: returns empty set if caller is not super_admin AND not org_admin of p_org_id.

CREATE OR REPLACE FUNCTION public.get_org_students_stats(
  p_org_id     uuid,
  p_examen_id  bigint,
  p_search     text    DEFAULT NULL,
  p_sort       text    DEFAULT 'nume_asc',
  p_limit      int     DEFAULT 25,
  p_offset     int     DEFAULT 0
)
RETURNS TABLE (
  user_id              uuid,
  nume                 text,
  email                text,
  simulari_finalizate  int,
  scor_mediu           numeric,
  rata_trecere_pct     numeric,
  ultima_activitate    timestamptz,
  nivel_pregatire_pct  numeric,
  examene_participate  int,
  examene_acces        int,
  intrebari_problema   int,
  total_count          bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prag       numeric;
  v_pool_size  int;
BEGIN
  IF NOT public.can_view_org_stats(p_org_id) THEN
    RETURN;
  END IF;

  -- Cache exam-level constants once
  SELECT prag_trecere INTO v_prag
    FROM public.examene WHERE id = p_examen_id;

  SELECT count(*) INTO v_pool_size
    FROM public.intrebari WHERE examen_id = p_examen_id;

  RETURN QUERY
  WITH org_students AS (
    SELECT p.id, p.nume, p.email
      FROM public.profiles p
     WHERE p.org_id = p_org_id
       AND p.role = 'user'
       AND (
         p_search IS NULL
         OR p.nume  ILIKE '%' || p_search || '%'
         OR p.email ILIKE '%' || p_search || '%'
       )
  ),
  sim_stats AS (
    SELECT
      s.user_id,
      count(*) FILTER (WHERE s.finalizat OR s.timed_out)            AS simulari_finalizate,
      avg(s.scor_procent) FILTER (WHERE s.finalizat OR s.timed_out) AS scor_mediu,
      100.0 * count(*) FILTER (WHERE (s.finalizat OR s.timed_out) AND s.scor_procent >= v_prag)
              / NULLIF(count(*) FILTER (WHERE s.finalizat OR s.timed_out), 0)
                                                                    AS rata_trecere_pct,
      max(coalesce(s.finished_at, s.started_at))                    AS ultima_activitate
      FROM public.sesiuni_simulare s
     WHERE s.examen_id = p_examen_id
     GROUP BY s.user_id
  ),
  prep_stats AS (
    -- Distinct correctly-answered questions for the exam, per user
    SELECT
      ir.user_id,
      count(DISTINCT ir.intrebare_id) AS corecte_unice
      FROM public.istoric_raspunsuri ir
     WHERE ir.examen_id = p_examen_id
       AND ir.corect = true
     GROUP BY ir.user_id
  ),
  problem_stats AS (
    SELECT
      si.user_id,
      count(*) AS intrebari_problema
      FROM public.status_invatare si
     WHERE si.examen_id = p_examen_id
       AND si.este_gresita = true
     GROUP BY si.user_id
  ),
  participated_exams AS (
    -- exams in this org where the student has at least one finalized simulation
    SELECT DISTINCT s.user_id, s.examen_id
      FROM public.sesiuni_simulare s
      JOIN public.examene e ON e.id = s.examen_id
     WHERE e.org_id = p_org_id
       AND (s.finalizat OR s.timed_out)
  ),
  access_exams AS (
    -- exams in this org the student has access to (non-expired or open-ended)
    SELECT DISTINCT a.user_id, a.examen_id
      FROM public.acces_examene a
      JOIN public.examene e ON e.id = a.examen_id
     WHERE e.org_id = p_org_id
       AND (a.data_expirare IS NULL OR a.data_expirare > now())
  ),
  exam_counts AS (
    SELECT
      os.id AS user_id,
      (SELECT count(*) FROM participated_exams pe WHERE pe.user_id = os.id) AS examene_participate,
      (SELECT count(*) FROM access_exams      ae WHERE ae.user_id = os.id) AS examene_acces
      FROM org_students os
  ),
  combined AS (
    SELECT
      os.id                                                         AS user_id,
      os.nume,
      os.email,
      coalesce(ss.simulari_finalizate, 0)::int                     AS simulari_finalizate,
      round(ss.scor_mediu, 1)                                       AS scor_mediu,
      round(ss.rata_trecere_pct, 1)                                 AS rata_trecere_pct,
      ss.ultima_activitate,
      CASE WHEN v_pool_size > 0
           THEN round(100.0 * coalesce(ps.corecte_unice, 0) / v_pool_size, 1)
           ELSE NULL END                                            AS nivel_pregatire_pct,
      ec.examene_participate::int,
      ec.examene_acces::int,
      coalesce(prob.intrebari_problema, 0)::int                     AS intrebari_problema
    FROM org_students os
    LEFT JOIN sim_stats     ss   ON ss.user_id   = os.id
    LEFT JOIN prep_stats    ps   ON ps.user_id   = os.id
    LEFT JOIN problem_stats prob ON prob.user_id = os.id
    LEFT JOIN exam_counts   ec   ON ec.user_id   = os.id
  )
  SELECT
    c.user_id,
    c.nume,
    c.email,
    c.simulari_finalizate,
    c.scor_mediu,
    c.rata_trecere_pct,
    c.ultima_activitate,
    c.nivel_pregatire_pct,
    c.examene_participate,
    c.examene_acces,
    c.intrebari_problema,
    (SELECT count(*) FROM combined)::bigint AS total_count
  FROM combined c
  ORDER BY
    CASE WHEN p_sort = 'nume_asc'                THEN c.nume                END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nume_desc'               THEN c.nume                END DESC NULLS LAST,
    CASE WHEN p_sort = 'scor_desc'               THEN c.scor_mediu          END DESC NULLS LAST,
    CASE WHEN p_sort = 'scor_asc'                THEN c.scor_mediu          END ASC  NULLS LAST,
    CASE WHEN p_sort = 'simulari_desc'           THEN c.simulari_finalizate END DESC NULLS LAST,
    CASE WHEN p_sort = 'ultima_activitate_desc'  THEN c.ultima_activitate   END DESC NULLS LAST,
    c.nume ASC
  LIMIT  greatest(1, least(coalesce(p_limit, 25), 200))
  OFFSET greatest(0, coalesce(p_offset, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_students_stats(uuid, bigint, text, text, int, int)
  TO authenticated;


-- ============================================================
-- PART 4 -- RPC: get_student_detail_stats
-- ============================================================
-- Detail view for the /dashboard/admin/elevi/[user_id]?examen_id=X page.
-- Returns:
--   - header info (nume, email, org)
--   - aggregate KPIs identical to the list (so the page can re-render without an extra call)
--   - last N simulations array (jsonb) for the evolution chart
--   - total time spent (sum of durata_secunde across simulare + practica)
--
-- Authorization: caller must be super_admin OR org_admin in the student's org.

CREATE OR REPLACE FUNCTION public.get_student_detail_stats(
  p_user_id    uuid,
  p_examen_id  bigint,
  p_history_n  int DEFAULT 20
)
RETURNS TABLE (
  user_id              uuid,
  nume                 text,
  email                text,
  org_id               uuid,
  org_nume             text,
  examen_nume          text,
  prag_trecere         numeric,
  simulari_finalizate  int,
  scor_mediu           numeric,
  rata_trecere_pct     numeric,
  ultima_activitate    timestamptz,
  nivel_pregatire_pct  numeric,
  intrebari_problema   int,
  timp_total_secunde   bigint,
  istoric_simulari     jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_org uuid;
  v_prag        numeric;
  v_pool_size   int;
BEGIN
  SELECT org_id INTO v_student_org FROM public.profiles WHERE id = p_user_id;
  IF v_student_org IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.can_view_org_stats(v_student_org) THEN
    RETURN;
  END IF;

  SELECT prag_trecere INTO v_prag FROM public.examene WHERE id = p_examen_id;
  SELECT count(*)     INTO v_pool_size FROM public.intrebari WHERE examen_id = p_examen_id;

  RETURN QUERY
  WITH last_sims AS (
    SELECT s.id, s.started_at, s.finished_at, s.scor_procent,
           s.raspunsuri_corecte, s.total_intrebari, s.durata_secunde, s.timed_out
      FROM public.sesiuni_simulare s
     WHERE s.user_id = p_user_id
       AND s.examen_id = p_examen_id
       AND (s.finalizat OR s.timed_out)
     ORDER BY coalesce(s.finished_at, s.started_at) DESC
     LIMIT greatest(1, least(coalesce(p_history_n, 20), 100))
  ),
  agg AS (
    SELECT
      count(*)                                                       AS sim_count,
      avg(scor_procent)                                              AS scor_mediu,
      100.0 * count(*) FILTER (WHERE scor_procent >= v_prag)
            / NULLIF(count(*), 0)                                    AS rata_trecere,
      max(coalesce(finished_at, started_at))                         AS ultima_activitate
      FROM public.sesiuni_simulare
     WHERE user_id = p_user_id
       AND examen_id = p_examen_id
       AND (finalizat OR timed_out)
  ),
  prep AS (
    SELECT count(DISTINCT intrebare_id) AS corecte_unice
      FROM public.istoric_raspunsuri
     WHERE user_id = p_user_id
       AND examen_id = p_examen_id
       AND corect = true
  ),
  problems AS (
    SELECT count(*) AS n
      FROM public.status_invatare
     WHERE user_id = p_user_id
       AND examen_id = p_examen_id
       AND este_gresita = true
  ),
  time_spent AS (
    SELECT coalesce(sum(durata_secunde), 0) AS total
      FROM (
        SELECT durata_secunde FROM public.sesiuni_simulare
         WHERE user_id = p_user_id AND examen_id = p_examen_id
        UNION ALL
        SELECT durata_secunde FROM public.sesiuni_practica
         WHERE user_id = p_user_id AND examen_id = p_examen_id
      ) t
  )
  SELECT
    p.id,
    p.nume,
    p.email,
    p.org_id,
    o.nume                          AS org_nume,
    e.nume_examen,
    v_prag,
    coalesce(a.sim_count, 0)::int   AS simulari_finalizate,
    round(a.scor_mediu, 1),
    round(a.rata_trecere, 1),
    a.ultima_activitate,
    CASE WHEN v_pool_size > 0
         THEN round(100.0 * coalesce(pr.corecte_unice, 0) / v_pool_size, 1)
         ELSE NULL END              AS nivel_pregatire_pct,
    coalesce(pb.n, 0)::int,
    coalesce(ts.total, 0)::bigint,
    coalesce(
      (SELECT jsonb_agg(
                jsonb_build_object(
                  'id',                  ls.id,
                  'started_at',          ls.started_at,
                  'finished_at',         ls.finished_at,
                  'scor_procent',        ls.scor_procent,
                  'raspunsuri_corecte',  ls.raspunsuri_corecte,
                  'total_intrebari',     ls.total_intrebari,
                  'durata_secunde',      ls.durata_secunde,
                  'timed_out',           ls.timed_out
                )
                ORDER BY coalesce(ls.finished_at, ls.started_at) ASC
              )
         FROM last_sims ls),
      '[]'::jsonb
    ) AS istoric_simulari
  FROM public.profiles p
  JOIN public.organizatii o ON o.id = p.org_id
  CROSS JOIN public.examene e
  LEFT JOIN agg        a ON true
  LEFT JOIN prep       pr ON true
  LEFT JOIN problems   pb ON true
  LEFT JOIN time_spent ts ON true
  WHERE p.id = p_user_id
    AND e.id = p_examen_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_detail_stats(uuid, bigint, int) TO authenticated;


-- ============================================================
-- PART 5 -- RPC: get_org_summary_stats
-- ============================================================
-- Compact aggregates for the dashboard widget. Returns one row.
-- For super_admin calling with a specific org_id -> that org's summary.
-- For super_admin calling with p_org_id = NULL -> global aggregate across all orgs (for the
--   super-admin master dashboard).
-- For org_admin -> only their own org; p_org_id NULL is rejected.

CREATE OR REPLACE FUNCTION public.get_org_summary_stats(
  p_org_id     uuid,
  p_examen_id  bigint
)
RETURNS TABLE (
  total_elevi          int,
  elevi_activi_7d      int,
  scor_mediu           numeric,
  elevi_cu_probleme    int   -- defined as: scor_mediu < prag OR rata_trecere < 50%
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super   boolean;
  v_caller_org uuid;
  v_prag       numeric;
BEGIN
  SELECT (role = 'super_admin'), org_id
    INTO v_is_super, v_caller_org
    FROM public.profiles WHERE id = auth.uid();

  IF v_is_super IS NULL THEN
    RETURN;
  END IF;

  -- Authorization
  IF NOT v_is_super THEN
    IF p_org_id IS NULL OR p_org_id <> v_caller_org THEN
      RETURN;
    END IF;
  END IF;

  SELECT prag_trecere INTO v_prag FROM public.examene WHERE id = p_examen_id;

  RETURN QUERY
  WITH org_users AS (
    SELECT p.id
      FROM public.profiles p
     WHERE p.role = 'user'
       AND (p_org_id IS NULL OR p.org_id = p_org_id)
  ),
  per_user AS (
    SELECT
      ou.id AS user_id,
      avg(s.scor_procent) FILTER (WHERE s.finalizat OR s.timed_out) AS scor_mediu,
      100.0 * count(*) FILTER (WHERE (s.finalizat OR s.timed_out) AND s.scor_procent >= v_prag)
            / NULLIF(count(*) FILTER (WHERE s.finalizat OR s.timed_out), 0) AS rata_trecere,
      max(coalesce(s.finished_at, s.started_at)) AS ultima
      FROM org_users ou
      LEFT JOIN public.sesiuni_simulare s
             ON s.user_id = ou.id AND s.examen_id = p_examen_id
     GROUP BY ou.id
  )
  SELECT
    (SELECT count(*) FROM org_users)::int                                   AS total_elevi,
    (SELECT count(*) FROM per_user WHERE ultima >= now() - interval '7 days')::int
                                                                            AS elevi_activi_7d,
    round((SELECT avg(scor_mediu) FROM per_user WHERE scor_mediu IS NOT NULL), 1)
                                                                            AS scor_mediu,
    (SELECT count(*) FROM per_user
       WHERE scor_mediu IS NOT NULL
         AND (scor_mediu < v_prag OR rata_trecere < 50))::int               AS elevi_cu_probleme;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_summary_stats(uuid, bigint) TO authenticated;
