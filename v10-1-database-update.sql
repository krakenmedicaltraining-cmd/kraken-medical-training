-- KRAKEN MEDICAL TRAINING V10.1: INSTRUCTOR HUB AND LEARNER ANALYTICS
alter table public.courses add column if not exists access_type text not null default 'public' check (access_type in ('public','login','invite'));
alter table public.courses add column if not exists prerequisite_course_id text references public.courses(id) on delete set null;
alter table public.courses add column if not exists max_quiz_attempts integer check (max_quiz_attempts is null or max_quiz_attempts > 0);
alter table public.courses add column if not exists quiz_time_limit integer check (quiz_time_limit is null or quiz_time_limit > 0);
alter table public.certificates add column if not exists revoked boolean not null default false;
alter table public.certificates add column if not exists revoked_at timestamptz;
alter table public.certificates add column if not exists revoked_reason text;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
alter table public.announcements enable row level security;
drop policy if exists "Anyone can read active announcements" on public.announcements;
create policy "Anyone can read active announcements" on public.announcements for select to anon, authenticated using (is_active = true and (expires_at is null or expires_at > now()));
drop policy if exists "Admins manage announcements" on public.announcements;
create policy "Admins manage announcements" on public.announcements for all to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));

create table if not exists public.course_enrollments (
  course_id text not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  enrolled_by uuid references auth.users(id) on delete set null,
  primary key (course_id,user_id)
);
alter table public.course_enrollments enable row level security;
drop policy if exists "Learners read own enrolments" on public.course_enrollments;
create policy "Learners read own enrolments" on public.course_enrollments for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Admins manage enrolments" on public.course_enrollments;
create policy "Admins manage enrolments" on public.course_enrollments for all to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));

-- Admin/instructor read access to learner records.
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles for select to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
drop policy if exists "Admins read all progress" on public.course_progress;
create policy "Admins read all progress" on public.course_progress for select to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
drop policy if exists "Admins update progress" on public.course_progress;
create policy "Admins update progress" on public.course_progress for update to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
drop policy if exists "Admins manage certificates" on public.certificates;
create policy "Admins manage certificates" on public.certificates for all to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
drop policy if exists "Admins read badges" on public.user_badges;
create policy "Admins read badges" on public.user_badges for select to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));


-- V10.1 supporting tables for future learner detail panels and activity reporting.
create table if not exists public.instructor_notes (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.instructor_notes enable row level security;
drop policy if exists "Admins manage instructor notes" on public.instructor_notes;
create policy "Admins manage instructor notes" on public.instructor_notes for all to authenticated
using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())))
with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));

create table if not exists public.learner_activity (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  activity_type text not null,
  course_id text references public.courses(id) on delete set null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.learner_activity enable row level security;
drop policy if exists "Learners read own activity" on public.learner_activity;
create policy "Learners read own activity" on public.learner_activity for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Admins read learner activity" on public.learner_activity;
create policy "Admins read learner activity" on public.learner_activity for select to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));

