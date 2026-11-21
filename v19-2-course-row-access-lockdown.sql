-- Kraken Medical Training: Stage 2 course-row access lockdown
-- IMPORTANT: Run only AFTER the Stage 1 website has been deployed and tested.
-- This does not protect files in the public course-files bucket.
-- Review any additional SELECT policies before applying.
BEGIN;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read published courses" ON public.courses;
CREATE POLICY "Published public courses or entitled paid learners"
ON public.courses FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = (SELECT auth.uid()))
  OR (status = 'Published' AND COALESCE(access_type, 'public') = 'public')
  OR (
    status = 'Published'
    AND EXISTS (
      SELECT 1 FROM public.course_enrollments e
      WHERE e.course_id = courses.id
        AND e.learner_id = (SELECT auth.uid())
        AND e.access_status = 'active'
        AND e.revoked_at IS NULL
    )
  )
);
COMMIT;
-- Existing public_course_catalogue view is intentionally retained.
-- Verify no additional permissive SELECT policies expose paid rows.
-- RLS on courses does not protect public Storage URLs or third-party links.
