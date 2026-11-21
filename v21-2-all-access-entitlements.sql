-- Kraken All Access: server-verified subscription entitlement.
-- Run AFTER v21-1-membership-foundation.sql.
-- Does not grant access until a trusted Stripe webhook writes an active subscription.
begin;
create or replace function public.kraken_has_all_access(p_learner uuid default auth.uid())
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select p_learner is not null
  and p_learner = auth.uid()
  and exists (
    select 1 from public.membership_subscriptions s
    join public.membership_plans p on p.id=s.plan_id
    where s.learner_id=p_learner
      and s.status in ('active','trialing')
      and s.current_period_end > now()
      and s.stripe_subscription_id is not null
      and p.status='active'
  );
$$;
revoke all on function public.kraken_has_all_access(uuid) from public;
grant execute on function public.kraken_has_all_access(uuid) to authenticated;
-- Replace course SELECT with same existing rights plus all-access.
drop policy if exists "Published public courses or entitled paid learners" on public.courses;
create policy "Published public courses or entitled paid learners"
on public.courses for select to anon,authenticated using (
  exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
  or (status='Published' and coalesce(access_type,'public')='public')
  or (status='Published' and (
    exists(select 1 from public.course_enrollments e
      where e.course_id=courses.id and e.learner_id=(select auth.uid())
        and e.access_status='active' and e.revoked_at is null)
    or (coalesce(access_type,'public')='paid' and (select public.kraken_has_all_access()))
  ))
);
-- Extend private file access; preserve existing purchase, public and admin access.
drop policy if exists "KMT entitled learners read protected course files" on storage.objects;
create policy "KMT entitled learners read protected course files"
on storage.objects for select to authenticated using (
 bucket_id='protected-course-files'
 and (
  exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
  or exists(select 1 from public.courses c where c.id=split_part(name,'/',1)
    and c.status='Published' and coalesce(c.access_type,'public')='public')
  or exists(select 1 from public.course_enrollments e
    where e.course_id=split_part(name,'/',1) and e.learner_id=(select auth.uid())
    and e.access_status='active' and e.revoked_at is null)
  or ((select public.kraken_has_all_access()) and exists(
    select 1 from public.courses c where c.id=split_part(name,'/',1)
      and c.status='Published' and c.access_type='paid'))
 )
);
commit;
-- IMPORTANT: Inspect other permissive policies on courses, course_lessons
-- and storage.objects. Course lessons require their own equivalent RLS policy.
-- Do not treat this migration as a substitute for Stripe webhook verification.
