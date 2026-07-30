-- Kraken V12.4 Course Builder migration
-- Safe to run after the V12 Stage 1 migration.

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

alter table public.course_lessons add column if not exists blocks jsonb not null default '[]'::jsonb;

create index if not exists course_lessons_course_position_idx
on public.course_lessons(course_id, position);

-- Existing lesson fields remain in use for backwards compatibility.
-- V12.4 also stores the complete visual lesson structure in course_lessons.blocks.
