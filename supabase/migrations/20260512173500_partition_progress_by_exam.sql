-- Ensure user progress/bookmarks are partitioned per exam.
-- Handles both current table names (`bookmarks`, `status_invatare`)
-- and legacy names mentioned in requirements (`intrebari_salvate`, `progres_utilizator`).
DO $$
DECLARE
  examene_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO examene_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'examene'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped
  LIMIT 1;

  IF examene_id_type IS NULL THEN
    RAISE EXCEPTION 'Could not detect public.examene.id type';
  END IF;

  -- Add examen_id to all relevant tables if missing.
  IF to_regclass('public.intrebari_salvate') IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.intrebari_salvate ADD COLUMN IF NOT EXISTS examen_id %s', examene_id_type);
  END IF;

  IF to_regclass('public.progres_utilizator') IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.progres_utilizator ADD COLUMN IF NOT EXISTS examen_id %s', examene_id_type);
  END IF;

  IF to_regclass('public.bookmarks') IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS examen_id %s', examene_id_type);
  END IF;

  IF to_regclass('public.status_invatare') IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.status_invatare ADD COLUMN IF NOT EXISTS examen_id %s', examene_id_type);
  END IF;
END
$$;

-- Add foreign keys to examene(id) where applicable.
DO $$
BEGIN
  IF to_regclass('public.intrebari_salvate') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'intrebari_salvate_examen_id_fkey'
        AND conrelid = 'public.intrebari_salvate'::regclass
    ) THEN
      ALTER TABLE public.intrebari_salvate
      ADD CONSTRAINT intrebari_salvate_examen_id_fkey
      FOREIGN KEY (examen_id) REFERENCES public.examene(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.progres_utilizator') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'progres_utilizator_examen_id_fkey'
        AND conrelid = 'public.progres_utilizator'::regclass
    ) THEN
      ALTER TABLE public.progres_utilizator
      ADD CONSTRAINT progres_utilizator_examen_id_fkey
      FOREIGN KEY (examen_id) REFERENCES public.examene(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.bookmarks') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'bookmarks_examen_id_fkey'
        AND conrelid = 'public.bookmarks'::regclass
    ) THEN
      ALTER TABLE public.bookmarks
      ADD CONSTRAINT bookmarks_examen_id_fkey
      FOREIGN KEY (examen_id) REFERENCES public.examene(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.status_invatare') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'status_invatare_examen_id_fkey'
        AND conrelid = 'public.status_invatare'::regclass
    ) THEN
      ALTER TABLE public.status_invatare
      ADD CONSTRAINT status_invatare_examen_id_fkey
      FOREIGN KEY (examen_id) REFERENCES public.examene(id) ON DELETE CASCADE;
    END IF;
  END IF;
END
$$;

-- Ensure uniqueness is scoped by exam for all relevant user progress tables.
DO $$
BEGIN
  IF to_regclass('public.intrebari_salvate') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS intrebari_salvate_user_question_exam_uidx
      ON public.intrebari_salvate (user_id, intrebare_id, examen_id);
  END IF;

  IF to_regclass('public.progres_utilizator') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS progres_utilizator_user_question_exam_uidx
      ON public.progres_utilizator (user_id, intrebare_id, examen_id);
  END IF;

  IF to_regclass('public.bookmarks') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_user_question_exam_uidx
      ON public.bookmarks (user_id, intrebare_id, examen_id);
  END IF;

  IF to_regclass('public.status_invatare') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS status_invatare_user_question_exam_uidx
      ON public.status_invatare (user_id, intrebare_id, examen_id);
  END IF;
END
$$;
