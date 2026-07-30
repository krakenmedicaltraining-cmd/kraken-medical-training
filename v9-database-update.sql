-- KRAKEN MEDICAL TRAINING V9: ASSESSMENT, CERTIFICATES AND BADGES
alter table public.courses add column if not exists pass_mark integer not null default 80 check (pass_mark between 0 and 100);
alter table public.courses add column if not exists require_all_blocks boolean not null default true;
alter table public.courses add column if not exists certificate_enabled boolean not null default true;
alter table public.course_progress add column if not exists quiz_attempts jsonb not null default '{}'::jsonb;
alter table public.course_progress add column if not exists quiz_scores jsonb not null default '{}'::jsonb;
alter table public.course_progress add column if not exists final_score integer;

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_code text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  learner_name text not null,
  course_title text not null,
  final_score integer,
  issued_at timestamptz not null default now()
);
alter table public.certificates enable row level security;
drop policy if exists "Users can read own certificates" on public.certificates;
create policy "Users can read own certificates" on public.certificates for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Public can verify certificates" on public.certificates;
create policy "Public can verify certificates" on public.certificates for select to anon, authenticated using (true);
drop policy if exists "Users can create own certificates" on public.certificates;
create policy "Users can create own certificates" on public.certificates for insert to authenticated with check ((select auth.uid()) = user_id);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  badge_name text not null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);
alter table public.user_badges enable row level security;
drop policy if exists "Users can read own badges" on public.user_badges;
create policy "Users can read own badges" on public.user_badges for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can award own badges" on public.user_badges;
create policy "Users can award own badges" on public.user_badges for insert to authenticated with check ((select auth.uid()) = user_id);
