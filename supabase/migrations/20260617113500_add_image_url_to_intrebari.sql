-- Adaugă suport pentru imagini atașate întrebărilor.
-- Nullable — toate întrebările existente rămân valide fără imagine.
ALTER TABLE public.intrebari
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

COMMENT ON COLUMN public.intrebari.image_url IS
  'URL public Supabase Storage (bucket: question-images). NULL = fără imagine.';
