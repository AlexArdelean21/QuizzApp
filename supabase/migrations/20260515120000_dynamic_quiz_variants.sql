-- Dynamic quiz variants (2–10) + multiple correct answers.
--
-- The `intrebari` table now treats two columns as the source of truth:
--   * `variante`            jsonb   — ordered array of variant texts (≥ 2,
--                                    ≤ 10).
--   * `raspunsuri_corecte`  text[]  — labels of the correct variants (a..j).
--
-- The legacy columns `varianta_a/b/c` and `raspuns_corect` are kept around so
-- existing exams (and the older app surface) continue to work without any
-- data migration on the reader side. A BEFORE INSERT/UPDATE trigger mirrors
-- the two representations both ways so any writer (admin UI, import script,
-- direct SQL) ends up with consistent data.

-- 1. Relax NOT NULL constraints on legacy columns so writers can omit them
--    when they only provide the new JSONB shape.
ALTER TABLE public.intrebari
  ALTER COLUMN varianta_a DROP NOT NULL,
  ALTER COLUMN varianta_b DROP NOT NULL,
  ALTER COLUMN varianta_c DROP NOT NULL,
  ALTER COLUMN raspuns_corect DROP NOT NULL;

-- 2. Backfill the new JSONB columns from legacy data for every row that
--    still has empty arrays. This makes `variante` / `raspunsuri_corecte`
--    safe to read directly without falling back to legacy fields.
UPDATE public.intrebari
SET
  variante = jsonb_strip_nulls(
    jsonb_build_array(
      NULLIF(BTRIM(COALESCE(varianta_a, '')), ''),
      NULLIF(BTRIM(COALESCE(varianta_b, '')), ''),
      NULLIF(BTRIM(COALESCE(varianta_c, '')), '')
    )
  )
WHERE variante IS NULL OR jsonb_array_length(variante) = 0;

UPDATE public.intrebari
SET raspunsuri_corecte = ARRAY[LOWER(BTRIM(raspuns_corect))]
WHERE (raspunsuri_corecte IS NULL OR array_length(raspunsuri_corecte, 1) IS NULL)
  AND raspuns_corect IS NOT NULL
  AND BTRIM(raspuns_corect) <> '';

-- 3. Keep legacy and new representations in sync regardless of which one
--    the caller writes. We intentionally do not enforce a hard CHECK here
--    because the trigger normalizes either shape.
CREATE OR REPLACE FUNCTION public.intrebari_sync_variants()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count int;
  legacy_present boolean;
BEGIN
  -- If JSONB is empty/null but legacy is present, materialize JSONB from
  -- the legacy a/b/c fields (skipping empty entries to avoid stray "" rows).
  v_count := COALESCE(jsonb_array_length(NEW.variante), 0);
  legacy_present := (
    COALESCE(BTRIM(NEW.varianta_a), '') <> '' OR
    COALESCE(BTRIM(NEW.varianta_b), '') <> '' OR
    COALESCE(BTRIM(NEW.varianta_c), '') <> ''
  );

  IF v_count = 0 AND legacy_present THEN
    NEW.variante := (
      SELECT jsonb_agg(value)
      FROM (
        SELECT BTRIM(COALESCE(NEW.varianta_a, '')) AS value WHERE BTRIM(COALESCE(NEW.varianta_a, '')) <> ''
        UNION ALL
        SELECT BTRIM(COALESCE(NEW.varianta_b, '')) WHERE BTRIM(COALESCE(NEW.varianta_b, '')) <> ''
        UNION ALL
        SELECT BTRIM(COALESCE(NEW.varianta_c, '')) WHERE BTRIM(COALESCE(NEW.varianta_c, '')) <> ''
      ) src
    );
    v_count := COALESCE(jsonb_array_length(NEW.variante), 0);
  END IF;

  -- If JSONB has data, push the first 3 entries back into the legacy
  -- columns so older readers keep working. Anything beyond index 2 is
  -- ignored (legacy schema only knows about A/B/C).
  IF v_count > 0 THEN
    NEW.varianta_a := COALESCE(NULLIF(NEW.variante->>0, ''), '');
    NEW.varianta_b := COALESCE(NULLIF(NEW.variante->>1, ''), '');
    NEW.varianta_c := COALESCE(NULLIF(NEW.variante->>2, ''), '');
  END IF;

  -- Sync correct answers in the same fashion.
  IF (NEW.raspunsuri_corecte IS NULL OR array_length(NEW.raspunsuri_corecte, 1) IS NULL)
     AND NEW.raspuns_corect IS NOT NULL
     AND BTRIM(NEW.raspuns_corect) <> '' THEN
    NEW.raspunsuri_corecte := ARRAY[LOWER(BTRIM(NEW.raspuns_corect))];
  END IF;

  IF NEW.raspunsuri_corecte IS NOT NULL
     AND array_length(NEW.raspunsuri_corecte, 1) IS NOT NULL THEN
    -- Persist the first correct label into the legacy column for backwards
    -- compatibility (older queries still rely on a single character).
    NEW.raspuns_corect := LOWER(NEW.raspunsuri_corecte[1]);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS intrebari_sync_variants ON public.intrebari;
CREATE TRIGGER intrebari_sync_variants
  BEFORE INSERT OR UPDATE ON public.intrebari
  FOR EACH ROW
  EXECUTE FUNCTION public.intrebari_sync_variants();
