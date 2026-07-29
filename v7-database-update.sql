-- KRAKEN MEDICAL TRAINING V7 FOUNDATION UPDATE
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Learner',
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.course_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  completed_blocks jsonb not null default '[]'::jsonb,
  percent integer not null default 0 check (percent between 0 and 100),
  completed boolean not null default false,
  score integer,
  last_opened_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, course_id)
);
alter table public.profiles enable row level security;
alter table public.course_progress enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile" on public.profiles for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Users can read own progress" on public.course_progress;
create policy "Users can read own progress" on public.course_progress for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users can create own progress" on public.course_progress;
create policy "Users can create own progress" on public.course_progress for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Users can update own progress" on public.course_progress;
create policy "Users can update own progress" on public.course_progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
