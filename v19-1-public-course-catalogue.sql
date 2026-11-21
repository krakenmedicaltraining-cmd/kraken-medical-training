-- Kraken Medical Training: public course catalogue, phase 1
-- Run in Supabase SQL Editor BEFORE deploying the updated frontend.
-- Only safe catalogue fields are exposed. Does NOT change existing RLS.
BEGIN;
CREATE OR REPLACE VIEW public.public_course_catalogue AS
SELECT
  id, title, subtitle, description, category, difficulty, icon,
  thumbnail_url, banner_url, cover_image_url, banner_image_url,
  status, access_type, price_pence, currency,
  estimated_time, estimated_minutes, instructor, featured,
  certificate_enabled, created_at, updated_at
FROM public.courses
WHERE status = 'Published';
REVOKE ALL ON public.public_course_catalogue FROM PUBLIC;
GRANT SELECT ON public.public_course_catalogue TO anon, authenticated;
COMMIT;
-- IMPORTANT: A view does not secure the original public.courses table.
-- Do not revoke access to public.courses until all client queries are migrated.
