-- Kraken Medical V17.3.2
-- Standalone manual certificate creator.
-- Keeps face-to-face/manual certificates separate from account-linked course certificates.

create table if not exists public.manual_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_code text not null unique,
  learner_name text not null,
  learner_email text,
  course_title text not null,
  course_reference text,
  training_date date not null,
  duration text,
  instructor_name text,
  location text,
  final_score integer,
  expires_at date,
  notes text,
  status text not null default 'valid',
  revoked boolean not null default false,
  revoked_reason text,
  revoked_at timestamptz,
  border_colour text default '#17493f',
  logo_url text,
  issued_by uuid,
  issued_at timestamptz not null default now()
);

alter table public.manual_certificates enable row level security;

drop policy if exists "Admins manage manual certificates" on public.manual_certificates;
create policy "Admins manage manual certificates"
on public.manual_certificates
for all
to authenticated
using (
  exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);

drop policy if exists "Public can verify manual certificates" on public.manual_certificates;
create policy "Public can verify manual certificates"
on public.manual_certificates
for select
to anon, authenticated
using (true);

select 'Standalone manual certificate table ready' as status;
