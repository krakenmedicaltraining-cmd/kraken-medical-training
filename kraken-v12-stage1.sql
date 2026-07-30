-- Kraken Medical Training V12 Stage 1
-- Run in Supabase SQL Editor once. This migration is additive and preserves existing courses.

alter table public.courses add column if not exists subtitle text;
alter table public.courses add column if not exists difficulty text default 'All levels';
alter table public.courses add column if not exists estimated_time text;
alter table public.courses add column if not exists thumbnail_url text;
alter table public.courses add column if not exists banner_url text;
alter table public.courses add column if not exists instructor text;
alter table public.courses add column if not exists xp_reward integer default 200;
alter table public.courses add column if not exists featured boolean default false;
alter table public.courses add column if not exists simulation_url text;
alter table public.courses add column if not exists quiz_enabled boolean default false;
alter table public.courses add column if not exists simulation_enabled boolean default false;
alter table public.courses add column if not exists podcast_enabled boolean default false;
alter table public.courses add column if not exists downloads_enabled boolean default true;
alter table public.courses add column if not exists reflection_enabled boolean default false;

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  position integer not null default 1,
  title text not null,
  summary text default '',
  content text default '',
  video_url text,
  podcast_url text,
  simulation_url text,
  estimated_minutes integer default 5,
  is_preview boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists course_lessons_course_position_idx on public.course_lessons(course_id, position);

create table if not exists public.course_downloads (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  position integer not null default 1,
  name text not null,
  resource_type text default 'Download',
  url text not null,
  created_at timestamptz default now()
);
create index if not exists course_downloads_course_position_idx on public.course_downloads(course_id, position);

create table if not exists public.course_certificates (
  id uuid primary key default gen_random_uuid(),
  course_id text not null unique references public.courses(id) on delete cascade,
  certificate_name text,
  cpd_hours numeric(5,2) default 0,
  template_key text default 'kraken-standard',
  created_at timestamptz default now()
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  lesson_id text not null,
  completed boolean default false,
  completed_at timestamptz,
  last_opened_at timestamptz default now(),
  unique(user_id, lesson_id)
);
create index if not exists lesson_progress_user_course_idx on public.lesson_progress(user_id, course_id);

alter table public.course_lessons enable row level security;
alter table public.course_downloads enable row level security;
alter table public.course_certificates enable row level security;
alter table public.lesson_progress enable row level security;

-- Public can read learning content belonging to published courses.
drop policy if exists "Published lessons are readable" on public.course_lessons;
create policy "Published lessons are readable" on public.course_lessons for select using (
  exists(select 1 from public.courses c where c.id=course_lessons.course_id and c.status='Published')
);
drop policy if exists "Published downloads are readable" on public.course_downloads;
create policy "Published downloads are readable" on public.course_downloads for select using (
  exists(select 1 from public.courses c where c.id=course_downloads.course_id and c.status='Published')
);
drop policy if exists "Published certificate settings are readable" on public.course_certificates;
create policy "Published certificate settings are readable" on public.course_certificates for select using (
  exists(select 1 from public.courses c where c.id=course_certificates.course_id and c.status='Published')
);

-- Learners can manage only their own lesson progress.
drop policy if exists "Learners read own lesson progress" on public.lesson_progress;
create policy "Learners read own lesson progress" on public.lesson_progress for select using (auth.uid()=user_id);
drop policy if exists "Learners insert own lesson progress" on public.lesson_progress;
create policy "Learners insert own lesson progress" on public.lesson_progress for insert with check (auth.uid()=user_id);
drop policy if exists "Learners update own lesson progress" on public.lesson_progress;
create policy "Learners update own lesson progress" on public.lesson_progress for update using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Existing admin_users can manage course content.
drop policy if exists "Admins manage lessons" on public.course_lessons;
create policy "Admins manage lessons" on public.course_lessons for all using (
  exists(select 1 from public.admin_users a where a.user_id=auth.uid())
) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "Admins manage downloads" on public.course_downloads;
create policy "Admins manage downloads" on public.course_downloads for all using (
  exists(select 1 from public.admin_users a where a.user_id=auth.uid())
) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists "Admins manage certificate settings" on public.course_certificates;
create policy "Admins manage certificate settings" on public.course_certificates for all using (
  exists(select 1 from public.admin_users a where a.user_id=auth.uid())
) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
