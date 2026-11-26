-- Kraken v24.1: scheduled training foundation. No checkout enabled.
begin;
create table public.in_person_sessions (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.in_person_courses(id) on delete restrict,
 starts_at timestamptz not null,
 ends_at timestamptz not null check (ends_at > starts_at),
 location_name text not null check (length(trim(location_name)) > 0),
 venue_address text not null default '',
 instructor_name text not null default '',
 capacity integer not null check (capacity between 1 and 1000),
 price_pence integer not null check (price_pence between 0 and 10000000),
 currency text not null default 'gbp' check (currency='gbp'),
 status text not null default 'draft' check (status in ('draft','published','cancelled','completed')),
 created_at timestamptz not null default now()
);
create table public.in_person_bookings (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.in_person_sessions(id) on delete restrict,
 learner_id uuid not null references auth.users(id) on delete restrict,
 status text not null default 'reserved' check (status in ('reserved','confirmed','expired','cancelled','refunded')),
 reserved_until timestamptz,
 price_pence integer not null check (price_pence >= 0),
 stripe_checkout_session_id text unique,
 stripe_payment_intent_id text unique,
 order_id uuid references public.kraken_orders(id) on delete restrict,
 created_at timestamptz not null default now(),
 check (status <> 'reserved' or reserved_until is not null)
);
create unique index in_person_one_live_booking on public.in_person_bookings(session_id,learner_id) where status in ('reserved','confirmed');
create index in_person_sessions_course_date on public.in_person_sessions(course_id,starts_at);
create index in_person_bookings_learner on public.in_person_bookings(learner_id);
alter table public.in_person_sessions enable row level security;
alter table public.in_person_bookings enable row level security;
revoke all on public.in_person_sessions,public.in_person_bookings from public,anon,authenticated;
grant select on public.in_person_sessions to anon,authenticated;
grant insert,update,delete on public.in_person_sessions to authenticated;
grant select on public.in_person_bookings to authenticated;
grant all on public.in_person_sessions,public.in_person_bookings to service_role;
create policy session_read on public.in_person_sessions for select to anon,authenticated using (public.kraken_is_admin() or (status='published' and exists(select 1 from public.in_person_courses c where c.id=course_id and c.status='Published')));
create policy session_insert on public.in_person_sessions for insert to authenticated with check (public.kraken_is_admin() and status='draft');
create policy session_update_draft on public.in_person_sessions for update to authenticated using (public.kraken_is_admin() and status='draft') with check (public.kraken_is_admin() and status='draft');
create policy session_delete_draft on public.in_person_sessions for delete to authenticated using (public.kraken_is_admin() and status='draft');
create policy booking_read on public.in_person_bookings for select to authenticated using (learner_id=(select auth.uid()) or public.kraken_is_admin());
-- No client booking writes or session publishing yet.
-- Future payment migration must implement atomic seat reservation with session row locking,
-- Stripe expiry reconciliation and verified webhook confirmation before publishing sessions.
notify pgrst,'reload schema';
commit;
