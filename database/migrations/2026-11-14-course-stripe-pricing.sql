-- Kraken Commerce: link each paid course to a Stripe Price.
-- Safe to run more than once. No existing purchase or enrolment records are changed.
BEGIN;
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS stripe_price_id text;
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS stripe_product_id text;
-- Existing test-mode BLS Stripe price. Replace with a live-mode price at launch.
UPDATE public.courses
SET stripe_price_id = 'price_1Ua9WgHSZVagY8pgQmRJgPMY'
WHERE id = 'adult-basic-life-support-aed'
  AND access_type = 'paid'
  AND price_pence = 1499
  AND (stripe_price_id IS NULL OR stripe_price_id = 'price_1Ua9WgHSZVagY8pgQmRJgPMY');
COMMIT;
SELECT id, title, access_type, price_pence, currency, stripe_price_id
FROM public.courses
WHERE access_type = 'paid'
ORDER BY title;
