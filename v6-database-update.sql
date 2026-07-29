-- KRAKEN MEDICAL TRAINING V6 MIGRATION
-- Run once in Supabase SQL Editor.

alter table public.courses
add column if not exists content_blocks jsonb not null default '[]'::jsonb;
