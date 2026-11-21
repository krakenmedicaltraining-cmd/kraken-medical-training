-- Kraken Commerce v1: foundation for a unified checkout ledger.
-- Run in Supabase SQL Editor. This does NOT change the existing Stripe Worker,
-- historical purchases, or entitlement policies.
begin;
create table if not exists public.kraken_orders (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending','paid','partially_refunded','refunded','cancelled','failed')),
  currency text not null default 'gbp',
  subtotal_pence integer not null default 0 check (subtotal_pence >= 0),
  total_pence integer not null default 0 check (total_pence >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.kraken_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.kraken_orders(id) on delete restrict,
  item_type text not null check (item_type in ('course','collection','resource','session','membership')),
  item_reference text not null,
  title_snapshot text not null,
  quantity integer not null default 1 check (quantity between 1 and 100),
  unit_price_pence integer not null check (unit_price_pence >= 0),
  total_pence integer not null check (total_pence >= 0),
  created_at timestamptz not null default now()
);
create index if not exists kraken_orders_learner_date_idx
  on public.kraken_orders (learner_id, created_at desc);
create index if not exists kraken_order_items_order_idx
  on public.kraken_order_items (order_id);
alter table public.kraken_orders enable row level security;
alter table public.kraken_order_items enable row level security;
drop policy if exists "Learners read own Kraken orders" on public.kraken_orders;
create policy "Learners read own Kraken orders" on public.kraken_orders
  for select to authenticated using (learner_id = (select auth.uid()));
drop policy if exists "Learners read own Kraken order items" on public.kraken_order_items;
create policy "Learners read own Kraken order items" on public.kraken_order_items
  for select to authenticated using (
    exists (select 1 from public.kraken_orders o
      where o.id = order_id and o.learner_id = (select auth.uid()))
  );
revoke all on public.kraken_orders, public.kraken_order_items from anon;
grant select on public.kraken_orders, public.kraken_order_items to authenticated;
-- No INSERT/UPDATE/DELETE grants to learners.
-- Future trusted Stripe Worker webhook will write via service role only,
-- using verified Stripe events, idempotent order processing and server-calculated prices.
commit;
