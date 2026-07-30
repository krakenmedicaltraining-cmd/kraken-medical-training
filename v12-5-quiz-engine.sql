-- Kraken V12.5 Quiz Builder and Assessment Engine

create extension if not exists pgcrypto;

create table if not exists public.course_quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  title text not null default 'Course assessment',
  pass_mark integer not null default 80 check (pass_mark between 0 and 100),
  max_attempts integer,
  time_limit_minutes integer,
  question_limit integer,
  shuffle_questions boolean not null default true,
  shuffle_answers boolean not null default true,
  show_feedback boolean not null default true,
  required_for_completion boolean not null default true,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id)
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.course_quizzes(id) on delete cascade,
  position integer not null default 1,
  type text not null default 'multiple_choice'
    check (type in ('multiple_choice','true_false','scenario')),
  scenario text,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index integer not null default 0,
  explanation text,
  points integer not null default 1 check (points > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.course_quizzes(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  passed boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  timed_out boolean not null default false
);

create index if not exists quiz_questions_quiz_position_idx on public.quiz_questions(quiz_id, position);
create index if not exists quiz_attempts_user_course_idx on public.quiz_attempts(user_id, course_id, completed_at desc);

alter table public.course_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "Published quizzes are readable" on public.course_quizzes;
create policy "Published quizzes are readable" on public.course_quizzes for select using (is_published = true);

drop policy if exists "Published quiz questions are readable" on public.quiz_questions;
create policy "Published quiz questions are readable" on public.quiz_questions for select using (
  exists(select 1 from public.course_quizzes q where q.id = quiz_id and q.is_published = true)
);

drop policy if exists "Learners read own attempts" on public.quiz_attempts;
create policy "Learners read own attempts" on public.quiz_attempts for select using (auth.uid() = user_id);

drop policy if exists "Learners insert own attempts" on public.quiz_attempts;
create policy "Learners insert own attempts" on public.quiz_attempts for insert with check (auth.uid() = user_id);

-- Admin write policies use the existing profiles.role convention.
drop policy if exists "Admins manage quizzes" on public.course_quizzes;
create policy "Admins manage quizzes" on public.course_quizzes for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','instructor'))
) with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','instructor'))
);

drop policy if exists "Admins manage questions" on public.quiz_questions;
create policy "Admins manage questions" on public.quiz_questions for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','instructor'))
) with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','instructor'))
);

-- Course columns used by the player and builder.
alter table public.courses add column if not exists pass_mark integer default 80;
alter table public.courses add column if not exists max_quiz_attempts integer;
alter table public.courses add column if not exists quiz_time_limit integer;
