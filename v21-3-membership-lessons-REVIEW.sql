-- Extend course lesson RLS to paid all-access subscribers.
-- Review existing policies before running. This replaces the prior learner SELECT policy.
begin;
drop policy if exists "Learners read entitled course lessons" on public.course_lessons;
drop policy if exists "Public and entitled learners read course lessons" on public.course_lessons;
-- IMPORTANT: remove the previous permissive lesson SELECT policy in your project
-- before relying on this one; multiple permissive policies are OR-combined.
create policy "KMT public preview purchased and member lessons"
on public.course_lessons for select to anon,authenticated using (
  public.kraken_is_admin()
  or exists (
    select 1 from public.courses c where c.id=course_lessons.course_id
    and c.status='Published'
    and (coalesce(c.access_type,'public')='public'
      or (c.access_type='paid' and public.kraken_has_all_access()))
  )
  or exists (
    select 1 from public.course_enrollments e
    where e.course_id=course_lessons.course_id and e.learner_id=(select auth.uid())
      and e.access_status='active' and e.revoked_at is null
  )
  or (is_preview=true and exists(
    select 1 from public.public_course_catalogue c
    where c.id=course_lessons.course_id and c.status='Published'
  ))
);
commit;
-- Check actual column names (course_id, is_preview) and all existing
-- course_lessons SELECT policies BEFORE applying.
