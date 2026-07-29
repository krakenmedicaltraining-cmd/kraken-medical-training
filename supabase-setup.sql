-- KRAKEN MEDICAL TRAINING: SUPABASE SETUP
-- Run this entire file once in Supabase > SQL Editor > New query.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id text primary key,
  icon text not null default 'K',
  title text not null,
  status text not null default 'Draft'
    check (status in ('Draft', 'Published', 'Coming soon')),
  category text not null default 'Clinical skills',
  description text not null default '',
  lessons jsonb not null default '[]'::jsonb,
  pdf_url text,
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.courses enable row level security;

drop policy if exists "Admins can read own admin record" on public.admin_users;
create policy "Admins can read own admin record"
on public.admin_users for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Public can read published courses" on public.courses;
create policy "Public can read published courses"
on public.courses for select
to anon, authenticated
using (
  status = 'Published'
  or exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can insert courses" on public.courses;
create policy "Admins can insert courses"
on public.courses for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update courses" on public.courses;
create policy "Admins can update courses"
on public.courses for update
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

drop policy if exists "Admins can delete courses" on public.courses;
create policy "Admins can delete courses"
on public.courses for delete
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view course files" on storage.objects;
create policy "Public can view course files"
on storage.objects for select
to public
using (bucket_id = 'course-files');

drop policy if exists "Admins can upload course files" on storage.objects;
create policy "Admins can upload course files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'course-files'
  and exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update course files" on storage.objects;
create policy "Admins can update course files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'course-files'
  and exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'course-files'
  and exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can delete course files" on storage.objects;
create policy "Admins can delete course files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'course-files'
  and exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

-- AFTER creating your administrator account in Authentication > Users,
-- replace the email below and run only this final statement:
--
-- insert into public.admin_users (user_id)
-- select id from auth.users
-- where email = 'YOUR-ADMIN-EMAIL@example.com'
-- on conflict (user_id) do nothing;
