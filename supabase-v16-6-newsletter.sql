-- ============================================================
-- KRAKEN MEDICAL TRAINING V16.6
-- NEWSLETTER / MAILING LIST
-- Safe to run more than once.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Mailing list
create table if not exists public.mailing_list (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'homepage',
  is_active boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mailing_list
  add column if not exists source text default 'homepage',
  add column if not exists is_active boolean not null default true,
  add column if not exists unsubscribe_token uuid default gen_random_uuid(),
  add column if not exists consented_at timestamptz default now(),
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.mailing_list
set unsubscribe_token = gen_random_uuid()
where unsubscribe_token is null;

alter table public.mailing_list
  alter column unsubscribe_token set default gen_random_uuid();

create unique index if not exists mailing_list_email_lower_idx
  on public.mailing_list (lower(email));

create unique index if not exists mailing_list_unsubscribe_token_idx
  on public.mailing_list (unsubscribe_token);

create index if not exists mailing_list_active_idx
  on public.mailing_list (is_active, created_at desc);


-- 2) Newsletter sends
create table if not exists public.newsletter_sends (
  id uuid primary key default gen_random_uuid(),
  journal_item_id uuid references public.journal_items(id) on delete set null,
  subscriber_id uuid references public.mailing_list(id) on delete set null,
  email text not null,
  provider_message_id text,
  status text not null default 'queued'
    check (status in ('queued','sent','failed','skipped')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_sends_item_subscriber_idx
  on public.newsletter_sends(journal_item_id, subscriber_id)
  where journal_item_id is not null and subscriber_id is not null;

create index if not exists newsletter_sends_item_idx
  on public.newsletter_sends(journal_item_id, created_at desc);

create index if not exists newsletter_sends_status_idx
  on public.newsletter_sends(status, created_at desc);


-- 3) Keep updated_at current
create or replace function public.kraken_mailing_list_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kraken_mailing_list_updated_at_trigger
on public.mailing_list;

create trigger kraken_mailing_list_updated_at_trigger
before update on public.mailing_list
for each row execute function public.kraken_mailing_list_updated_at();


-- 4) Public subscribe RPC
-- This lets the homepage safely subscribe/re-subscribe an email without
-- exposing the subscriber table for public reads.
create or replace function public.subscribe_newsletter(
  p_email text,
  p_source text default 'homepage'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_email text;
  existing_id uuid;
begin
  clean_email := lower(trim(p_email));

  if clean_email is null
     or length(clean_email) < 5
     or clean_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  then
    raise exception 'Please enter a valid email address.';
  end if;

  select id into existing_id
  from public.mailing_list
  where lower(email) = clean_email
  limit 1;

  if existing_id is not null then
    update public.mailing_list
    set
      email = clean_email,
      source = coalesce(nullif(trim(p_source),''), source, 'homepage'),
      is_active = true,
      consented_at = now(),
      unsubscribed_at = null,
      unsubscribe_token = gen_random_uuid(),
      updated_at = now()
    where id = existing_id;

    return jsonb_build_object(
      'ok', true,
      'status', 'resubscribed'
    );
  end if;

  insert into public.mailing_list(email, source, is_active, consented_at)
  values (
    clean_email,
    coalesce(nullif(trim(p_source),''), 'homepage'),
    true,
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'subscribed'
  );
end;
$$;

grant execute on function public.subscribe_newsletter(text,text)
to anon, authenticated;


-- 5) RLS
alter table public.mailing_list enable row level security;
alter table public.newsletter_sends enable row level security;

drop policy if exists "Admins manage mailing list"
on public.mailing_list;

create policy "Admins manage mailing list"
on public.mailing_list
for all
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);

drop policy if exists "Admins view newsletter sends"
on public.newsletter_sends;

create policy "Admins view newsletter sends"
on public.newsletter_sends
for select
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);

-- Edge Functions use the service role and therefore do not need public
-- insert/update policies on newsletter_sends.

notify pgrst, 'reload schema';
