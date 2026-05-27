-- ============================================================
-- PART A.1 — RLS policies for `organizatii`
-- ============================================================

ALTER TABLE public.organizatii ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin manages organizations" ON public.organizatii;
DROP POLICY IF EXISTS "Org admin reads own organization"  ON public.organizatii;
DROP POLICY IF EXISTS "User reads own organization"       ON public.organizatii;

CREATE POLICY "Super admin manages organizations"
  ON public.organizatii
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Org admin reads own organization"
  ON public.organizatii
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.org_id = public.organizatii.id
    )
  );

CREATE POLICY "User reads own organization"
  ON public.organizatii
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'user'
        AND p.org_id = public.organizatii.id
    )
  );

-- ============================================================
-- PART A.2 — Rewrite get_org_students_stats with CORRECT rate calculation
-- ============================================================

DROP FUNCTION IF EXISTS public.get_org_students_stats(uuid, bigint, text, text, int, int);

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
  timp_dedicat_secunde bigint,
  total_count          bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prag       int;
  v_pool_size  int;
BEGIN
  IF NOT public.can_view_org_stats(p_org_id) THEN
    RETURN;
  END IF;

  SELECT prag_trecere::int INTO v_prag
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
      100.0 * count(*) FILTER (
        WHERE (s.finalizat OR s.timed_out)
          AND s.raspunsuri_corecte >= v_prag
      )
      / NULLIF(count(*) FILTER (WHERE s.finalizat OR s.timed_out), 0)
                                                                    AS rata_trecere_pct,
      max(coalesce(s.finished_at, s.started_at))                    AS ultima_activitate
      FROM public.sesiuni_simulare s
     WHERE s.examen_id = p_examen_id
     GROUP BY s.user_id
  ),
  prep_stats AS (
    SELECT
      ir.user_id,
      count(DISTINCT ir.intrebare_id) AS corecte_unice
      FROM public.istoric_raspunsuri ir
     WHERE ir.examen_id = p_examen_id
       AND ir.corect = true
     GROUP BY ir.user_id
  ),
  time_stats AS (
    SELECT user_id, sum(durata_secunde)::bigint AS total
      FROM (
        SELECT user_id, durata_secunde FROM public.sesiuni_simulare WHERE examen_id = p_examen_id
        UNION ALL
        SELECT user_id, durata_secunde FROM public.sesiuni_practica  WHERE examen_id = p_examen_id
      ) t
     GROUP BY user_id
  ),
  participated_exams AS (
    SELECT DISTINCT s.user_id, s.examen_id
      FROM public.sesiuni_simulare s
      JOIN public.examene e ON e.id = s.examen_id
     WHERE e.org_id = p_org_id
       AND (s.finalizat OR s.timed_out)
  ),
  access_exams AS (
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
      os.id                                                        AS user_id,
      os.nume,
      os.email,
      coalesce(ss.simulari_finalizate, 0)::int                     AS simulari_finalizate,
      round(ss.scor_mediu, 1)                                      AS scor_mediu,
      round(ss.rata_trecere_pct, 1)                                AS rata_trecere_pct,
      ss.ultima_activitate,
      CASE WHEN v_pool_size > 0
           THEN round(100.0 * coalesce(ps.corecte_unice, 0) / v_pool_size, 1)
           ELSE NULL END                                           AS nivel_pregatire_pct,
      ec.examene_participate::int,
      ec.examene_acces::int,
      coalesce(ts.total, 0)::bigint                                AS timp_dedicat_secunde
    FROM org_students os
    LEFT JOIN sim_stats     ss   ON ss.user_id   = os.id
    LEFT JOIN prep_stats    ps   ON ps.user_id   = os.id
    LEFT JOIN time_stats    ts   ON ts.user_id   = os.id
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
    c.timp_dedicat_secunde,
    (SELECT count(*) FROM combined)::bigint AS total_count
  FROM combined c
  ORDER BY
    CASE WHEN p_sort = 'nume_asc'                THEN c.nume               END ASC  NULLS LAST,
    CASE WHEN p_sort = 'nume_desc'               THEN c.nume               END DESC NULLS LAST,
    CASE WHEN p_sort = 'scor_desc'               THEN c.scor_mediu         END DESC NULLS LAST,
    CASE WHEN p_sort = 'scor_asc'                THEN c.scor_mediu         END ASC  NULLS LAST,
    CASE WHEN p_sort = 'simulari_desc'           THEN c.simulari_finalizate END DESC NULLS LAST,
    CASE WHEN p_sort = 'timp_desc'               THEN c.timp_dedicat_secunde END DESC NULLS LAST,
    CASE WHEN p_sort = 'ultima_activitate_desc'  THEN c.ultima_activitate  END DESC NULLS LAST,
    c.nume ASC
  LIMIT  greatest(1, least(coalesce(p_limit, 25), 200))
  OFFSET greatest(0, coalesce(p_offset, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_students_stats(uuid, bigint, text, text, int, int)
  TO authenticated;

-- ============================================================
-- PART A.3 — Rewrite get_student_detail_stats with CORRECT rate calculation
-- ============================================================

DROP FUNCTION IF EXISTS public.get_student_detail_stats(uuid, bigint, int);

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
  prag_trecere         int,
  intrebari_simulare   int,
  simulari_finalizate  int,
  scor_mediu           numeric,
  rata_trecere_pct     numeric,
  ultima_activitate    timestamptz,
  nivel_pregatire_pct  numeric,
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
  v_prag        int;
  v_pool_size   int;
  v_intr_sim    int;
BEGIN
  SELECT org_id INTO v_student_org FROM public.profiles WHERE id = p_user_id;
  IF v_student_org IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.can_view_org_stats(v_student_org) THEN
    RETURN;
  END IF;

  SELECT prag_trecere::int, intrebari_simulare::int
    INTO v_prag, v_intr_sim
    FROM public.examene WHERE id = p_examen_id;

  SELECT count(*) INTO v_pool_size FROM public.intrebari WHERE examen_id = p_examen_id;

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
      100.0 * count(*) FILTER (WHERE raspunsuri_corecte >= v_prag)
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
    v_intr_sim,
    coalesce(a.sim_count, 0)::int   AS simulari_finalizate,
    round(a.scor_mediu, 1),
    round(a.rata_trecere, 1),
    a.ultima_activitate,
    CASE WHEN v_pool_size > 0
         THEN round(100.0 * coalesce(pr.corecte_unice, 0) / v_pool_size, 1)
         ELSE NULL END              AS nivel_pregatire_pct,
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
                  'timed_out',           ls.timed_out,
                  'a_trecut',            ls.raspunsuri_corecte >= v_prag
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
  LEFT JOIN time_spent ts ON true
  WHERE p.id = p_user_id
    AND e.id = p_examen_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_detail_stats(uuid, bigint, int) TO authenticated;

-- ============================================================
-- PART A.4 — Rewrite get_org_summary_stats with CORRECT rate calculation
-- ============================================================

DROP FUNCTION IF EXISTS public.get_org_summary_stats(uuid, bigint);

CREATE OR REPLACE FUNCTION public.get_org_summary_stats(
  p_org_id     uuid,
  p_examen_id  bigint
)
RETURNS TABLE (
  total_elevi          int,
  elevi_activi_7d      int,
  scor_mediu           numeric,
  elevi_cu_probleme    int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super   boolean;
  v_caller_org uuid;
  v_prag       int;
BEGIN
  SELECT (role = 'super_admin'), org_id
    INTO v_is_super, v_caller_org
    FROM public.profiles WHERE id = auth.uid();

  IF v_is_super IS NULL THEN
    RETURN;
  END IF;

  IF NOT v_is_super THEN
    IF p_org_id IS NULL OR p_org_id <> v_caller_org THEN
      RETURN;
    END IF;
  END IF;

  SELECT prag_trecere::int INTO v_prag FROM public.examene WHERE id = p_examen_id;

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
      100.0 * count(*) FILTER (
        WHERE (s.finalizat OR s.timed_out) AND s.raspunsuri_corecte >= v_prag
      )
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
         AND rata_trecere < 50)::int                                        AS elevi_cu_probleme;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_summary_stats(uuid, bigint) TO authenticated;
