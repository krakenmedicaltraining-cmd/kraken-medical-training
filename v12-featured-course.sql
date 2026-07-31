-- Kraken Featured Course Selector
-- This makes the Course Builder's "Featured course" switch select one prime course.

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.keep_one_featured_course()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.featured = TRUE THEN
    UPDATE public.courses
    SET featured = FALSE
    WHERE id <> NEW.id
      AND featured = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keep_one_featured_course_trigger
ON public.courses;

CREATE TRIGGER keep_one_featured_course_trigger
BEFORE INSERT OR UPDATE OF featured
ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.keep_one_featured_course();

-- Remove the old hardcoded MARCH PAWS course as featured, if it exists.
UPDATE public.courses
SET featured = FALSE
WHERE LOWER(title) LIKE '%march paws%';

NOTIFY pgrst, 'reload schema';
