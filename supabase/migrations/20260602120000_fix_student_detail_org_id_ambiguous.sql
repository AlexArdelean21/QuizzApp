-- Fix: qualify all org_id references to avoid ambiguity with RETURNS TABLE column

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
  SELECT p.org_id INTO v_student_org FROM public.profiles p WHERE p.id = p_user_id;
  IF v_student_org IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.can_view_org_stats(v_student_org) THEN
    RETURN;
  END IF;

  SELECT e.prag_trecere::int, e.intrebari_simulare::int
    INTO v_prag, v_intr_sim
    FROM public.examene e WHERE e.id = p_examen_id;

  SELECT count(*) INTO v_pool_size FROM public.intrebari i WHERE i.examen_id = p_examen_id;

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
      avg(ss.scor_procent)                                           AS scor_mediu,
      100.0 * count(*) FILTER (WHERE ss.raspunsuri_corecte >= v_prag)
            / NULLIF(count(*), 0)                                    AS rata_trecere,
      max(coalesce(ss.finished_at, ss.started_at))                   AS ultima_activitate
      FROM public.sesiuni_simulare ss
     WHERE ss.user_id = p_user_id
       AND ss.examen_id = p_examen_id
       AND (ss.finalizat OR ss.timed_out)
  ),
  prep AS (
    SELECT count(DISTINCT ir.intrebare_id) AS corecte_unice
      FROM public.istoric_raspunsuri ir
     WHERE ir.user_id = p_user_id
       AND ir.examen_id = p_examen_id
       AND ir.corect = true
  ),
  time_spent AS (
    SELECT coalesce(sum(t.durata_secunde), 0) AS total
      FROM (
        SELECT sim.durata_secunde FROM public.sesiuni_simulare sim
         WHERE sim.user_id = p_user_id AND sim.examen_id = p_examen_id
        UNION ALL
        SELECT sp.durata_secunde FROM public.sesiuni_practica sp
         WHERE sp.user_id = p_user_id AND sp.examen_id = p_examen_id
      ) t
  )
  SELECT
    pr.id,
    pr.nume,
    pr.email,
    pr.org_id,
    o.nume                          AS org_nume,
    ex.nume_examen,
    v_prag,
    v_intr_sim,
    coalesce(a.sim_count, 0)::int   AS simulari_finalizate,
    round(a.scor_mediu, 1),
    round(a.rata_trecere, 1),
    a.ultima_activitate,
    CASE WHEN v_pool_size > 0
         THEN round(100.0 * coalesce(prp.corecte_unice, 0) / v_pool_size, 1)
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
  FROM public.profiles pr
  JOIN public.organizatii o ON o.id = pr.org_id
  CROSS JOIN public.examene ex
  LEFT JOIN agg        a   ON true
  LEFT JOIN prep       prp ON true
  LEFT JOIN time_spent ts  ON true
  WHERE pr.id = p_user_id
    AND ex.id = p_examen_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_detail_stats(uuid, bigint, int) TO authenticated;
