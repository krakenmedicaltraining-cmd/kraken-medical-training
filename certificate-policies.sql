-- Kraken quiz-to-certificate permissions
-- Run in Supabase SQL Editor if certificate insertion is blocked by RLS.

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own certificates"
ON public.certificates;

CREATE POLICY "Users can read own certificates"
ON public.certificates
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own certificates"
ON public.certificates;

CREATE POLICY "Users can create own certificates"
ON public.certificates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all certificates"
ON public.certificates;

CREATE POLICY "Admins can read all certificates"
ON public.certificates
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

NOTIFY pgrst, 'reload schema';
