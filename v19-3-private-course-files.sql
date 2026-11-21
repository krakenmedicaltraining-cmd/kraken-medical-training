-- Kraken Medical Training: private course materials (stage 1)
-- Run in Supabase SQL Editor before switching uploads to private storage.
-- Leaves the existing public course-files bucket untouched.
BEGIN;
INSERT INTO storage.buckets (id,name,public,file_size_limit)
VALUES ('protected-course-files','protected-course-files',false,52428800)
ON CONFLICT (id) DO UPDATE SET public = false;
DROP POLICY IF EXISTS "KMT admins upload protected course files" ON storage.objects;
CREATE POLICY "KMT admins upload protected course files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
 bucket_id = 'protected-course-files'
 AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = (SELECT auth.uid()))
);
DROP POLICY IF EXISTS "KMT admins manage protected course files" ON storage.objects;
CREATE POLICY "KMT admins manage protected course files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'protected-course-files'
 AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = (SELECT auth.uid())))
WITH CHECK (bucket_id = 'protected-course-files'
 AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "KMT admins delete protected course files" ON storage.objects;
CREATE POLICY "KMT admins delete protected course files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'protected-course-files'
 AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "KMT entitled learners read protected course files" ON storage.objects;
CREATE POLICY "KMT entitled learners read protected course files"
ON storage.objects FOR SELECT TO authenticated
USING (
 bucket_id = 'protected-course-files'
 AND (
  EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = (SELECT auth.uid()))
  OR EXISTS (
   SELECT 1 FROM public.courses c
   WHERE c.id = split_part(name, '/', 1)
    AND c.status = 'Published'
    AND COALESCE(c.access_type,'public') = 'public'
  )
  OR EXISTS (
   SELECT 1 FROM public.course_enrollments e
   WHERE e.course_id = split_part(name, '/', 1)
    AND e.learner_id = (SELECT auth.uid())
    AND e.access_status = 'active'
    AND e.revoked_at IS NULL
  )
 )
);
COMMIT;
-- IMPORTANT: Existing course-files public bucket is NOT secured by this migration.
-- Store protected files under COURSE_ID/filename; folder name is checked for entitlement.
-- Review other storage.objects SELECT policies: any broad policy can bypass this one.
-- Signed URLs remain valid until expiry even after an entitlement is revoked.
