-- Hash-based deduplication for exam question imports.
-- Replaces text-only uniqueness with normalized content uniqueness:
--   examen_id + normalized intrebare_text + normalized/sorted variante.

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

GRANT EXECUTE ON FUNCTION public.intrebare_content_hash(bigint, text, jsonb)
  TO authenticated, anon;

ALTER TABLE public.intrebari
  ADD COLUMN IF NOT EXISTS content_hash text;

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

UPDATE public.intrebari
   SET content_hash = public.intrebare_content_hash(examen_id, intrebare_text, variante)
 WHERE content_hash IS NULL;

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
      'Migration aborted: % duplicate content_hash group(s) found in intrebari. '
      'Run: SELECT content_hash, count(*), array_agg(id) FROM intrebari '
      'GROUP BY content_hash HAVING count(*) > 1; '
      'Resolve manually, then re-run.', dup_count;
  END IF;
END;
$$;

ALTER TABLE public.intrebari
  DROP CONSTRAINT IF EXISTS intrebare_unica_per_examen;

CREATE UNIQUE INDEX IF NOT EXISTS intrebari_content_hash_uidx
  ON public.intrebari (content_hash);

ALTER TABLE public.intrebari
  ALTER COLUMN content_hash SET NOT NULL;

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
    FROM jsonb_array_elements(coalesce(p_candidates, '[]'::jsonb)) AS elem
  ),
  db_hits AS (
    SELECT DISTINCT i.content_hash AS h
      FROM public.intrebari AS i
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
  FROM candidates AS c
  ORDER BY c.idx;
$$;

GRANT EXECUTE ON FUNCTION public.preview_intrebari_dedup(bigint, jsonb)
  TO authenticated;
