-- Kraken Medical V17.3: face-to-face certificate support
alter table public.certificates add column if not exists learner_email text;
alter table public.certificates add column if not exists training_date date;
alter table public.certificates add column if not exists instructor_name text;
alter table public.certificates add column if not exists location text;
alter table public.certificates add column if not exists duration text;
alter table public.certificates add column if not exists delivery_method text not null default 'online';
alter table public.certificates add column if not exists notes text;
alter table public.certificates add column if not exists status text not null default 'valid';
alter table public.certificates add column if not exists expires_at date;
alter table public.certificates add column if not exists issued_by uuid;
alter table public.certificates add column if not exists revoked boolean not null default false;
alter table public.certificates add column if not exists revoked_reason text;
alter table public.certificates add column if not exists revoked_at timestamptz;
alter table public.certificates add column if not exists border_colour text default '#17493f';
alter table public.certificates add column if not exists logo_url text;
create unique index if not exists certificates_certificate_code_unique on public.certificates(certificate_code);
alter table public.certificates enable row level security;
drop policy if exists "Admins manage certificates" on public.certificates;
create policy "Admins manage certificates" on public.certificates for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
-- Keep existing learner/public SELECT policies. The public verifier needs SELECT access by certificate_code.
