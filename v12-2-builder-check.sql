-- Kraken V12.2 Course Builder
-- Safe to run after the V12 Stage 1 migration.
-- This only makes sure the metadata columns required by the builder exist.
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
