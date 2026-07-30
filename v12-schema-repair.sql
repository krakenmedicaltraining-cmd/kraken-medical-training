-- Kraken V12 schema repair
-- Run this once in Supabase SQL Editor.

alter table public.courses add column if not exists subtitle text;
alter table public.courses add column if not exists difficulty text default 'All levels';
alter table public.courses add column if not exists estimated_time text;
alter table public.courses add column if not exists instructor text;
alter table public.courses add column if not exists thumbnail_url text;
alter table public.courses add column if not exists banner_url text;
alter table public.courses add column if not exists xp_reward integer default 200;
alter table public.courses add column if not exists featured boolean default false;
alter table public.courses add column if not exists simulation_url text;
alter table public.courses add column if not exists quiz_enabled boolean default false;
alter table public.courses add column if not exists simulation_enabled boolean default false;
alter table public.courses add column if not exists podcast_enabled boolean default false;
alter table public.courses add column if not exists downloads_enabled boolean default true;
alter table public.courses add column if not exists reflection_enabled boolean default false;
alter table public.courses add column if not exists certificate_enabled boolean default true;
alter table public.courses add column if not exists require_all_blocks boolean default true;
alter table public.courses add column if not exists pass_mark integer default 80;
alter table public.courses add column if not exists access_type text default 'public';
alter table public.courses add column if not exists prerequisite_course_id text;
alter table public.courses add column if not exists max_quiz_attempts integer;
alter table public.courses add column if not exists quiz_time_limit integer;

alter table public.course_lessons add column if not exists blocks jsonb not null default '[]'::jsonb;

-- Ask PostgREST to reload its schema cache immediately.
notify pgrst, 'reload schema';
