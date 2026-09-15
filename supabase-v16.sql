-- KRAKEN V16: IN-PERSON TRAINING
create table if not exists public.in_person_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text not null default '',
  category text,
  status text not null default 'Draft' check (status in ('Draft','Published')),
  featured boolean not null default false,
  duration text,
  max_learners integer,
  price_from numeric(10,2),
  price_suffix text,
  location_text text,
  thumbnail_url text,
  hero_image_url text,
  overview text,
  audience text,
  outcomes jsonb not null default '[]'::jsonb,
  client_provides jsonb not null default '[]'::jsonb,
  provider_provides jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_enquiries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.in_person_courses(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  organisation text,
  delegates integer,
  message text,
  status text not null default 'New',
  created_at timestamptz not null default now()
);

alter table public.in_person_courses enable row level security;
alter table public.training_enquiries enable row level security;

drop policy if exists "Public can view published in-person courses" on public.in_person_courses;
create policy "Public can view published in-person courses"
on public.in_person_courses for select
using (
  status = 'Published'
  or exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Admins create in-person courses" on public.in_person_courses;
create policy "Admins create in-person courses"
on public.in_person_courses for insert
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins update in-person courses" on public.in_person_courses;
create policy "Admins update in-person courses"
on public.in_person_courses for update
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins delete in-person courses" on public.in_person_courses;
create policy "Admins delete in-person courses"
on public.in_person_courses for delete
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Public can submit training enquiries" on public.training_enquiries;
create policy "Public can submit training enquiries"
on public.training_enquiries for insert
with check (true);

drop policy if exists "Admins can view training enquiries" on public.training_enquiries;
create policy "Admins can view training enquiries"
on public.training_enquiries for select
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins can update training enquiries" on public.training_enquiries;
create policy "Admins can update training enquiries"
on public.training_enquiries for update
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create index if not exists in_person_courses_status_idx on public.in_person_courses(status);
create index if not exists in_person_courses_category_idx on public.in_person_courses(category);
create index if not exists training_enquiries_created_idx on public.training_enquiries(created_at desc);
notify pgrst, 'reload schema';
