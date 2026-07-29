-- KRAKEN MEDICAL TRAINING V8 RESOURCE LIBRARY
-- Run once in Supabase > SQL Editor.

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  resource_type text not null default 'PDF',
  category text not null default 'Clinical skills',
  provider text not null default 'Google Drive',
  source_url text not null,
  thumbnail_url text,
  file_name text,
  tags jsonb not null default '[]'::jsonb,
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resources enable row level security;

drop policy if exists "Public can read public resources" on public.resources;
create policy "Public can read public resources"
on public.resources for select
to anon, authenticated
using (
  is_public = true
  or exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can insert resources" on public.resources;
create policy "Admins can insert resources"
on public.resources for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update resources" on public.resources;
create policy "Admins can update resources"
on public.resources for update
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can delete resources" on public.resources;
create policy "Admins can delete resources"
on public.resources for delete
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

alter table public.courses
add column if not exists resource_ids jsonb not null default '[]'::jsonb;
