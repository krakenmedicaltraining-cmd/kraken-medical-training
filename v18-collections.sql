-- Kraken Collections v1. Database + RLS. Run in Supabase SQL Editor before using the new admin UI.
-- Collection purchases and entitlement grants are managed by the separate Payments Worker.
create table if not exists public.course_collections (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 120),
 description text not null default '',
 price_pence integer not null default 0 check (price_pence >= 0 and price_pence <= 10000000),
 currency text not null default 'gbp' check (currency = 'gbp'),
 status text not null default 'Draft' check (status in ('Draft','Published')),
 stripe_product_id text,
 stripe_price_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint published_collection_has_price check (status <> 'Published' or (price_pence >= 50 and stripe_price_id is not null))
);
create table if not exists public.course_collection_items (
 collection_id uuid not null references public.course_collections(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete restrict,
 position integer not null default 0,
 primary key (collection_id, course_id)
);
create index if not exists course_collection_items_course_idx on public.course_collection_items(course_id);
create index if not exists course_collections_status_idx on public.course_collections(status);
create or replace function public.kraken_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admin_users where user_id = (select auth.uid())); $$;
revoke all on function public.kraken_is_admin() from public;
grant execute on function public.kraken_is_admin() to authenticated, anon;
alter table public.course_collections enable row level security;
alter table public.course_collection_items enable row level security;
drop policy if exists "Public reads published collections" on public.course_collections;
create policy "Public reads published collections" on public.course_collections for select to anon, authenticated using (status='Published' or public.kraken_is_admin());
drop policy if exists "Admins insert collections" on public.course_collections;
create policy "Admins insert collections" on public.course_collections for insert to authenticated with check (public.kraken_is_admin() and status='Draft' and stripe_price_id is null and stripe_product_id is null);
drop policy if exists "Admins update draft collections" on public.course_collections;
create policy "Admins update draft collections" on public.course_collections for update to authenticated using (public.kraken_is_admin() and status='Draft') with check (public.kraken_is_admin() and status='Draft');
drop policy if exists "Admins delete draft collections" on public.course_collections;
create policy "Admins delete draft collections" on public.course_collections for delete to authenticated using (public.kraken_is_admin() and status='Draft');
drop policy if exists "Public reads published collection items" on public.course_collection_items;
create policy "Public reads published collection items" on public.course_collection_items for select to anon, authenticated using (exists (select 1 from public.course_collections c where c.id=collection_id and (c.status='Published' or public.kraken_is_admin())));
drop policy if exists "Admins insert draft collection items" on public.course_collection_items;
create policy "Admins insert draft collection items" on public.course_collection_items for insert to authenticated with check (public.kraken_is_admin() and exists(select 1 from public.course_collections c where c.id=collection_id and c.status='Draft'));
drop policy if exists "Admins delete draft collection items" on public.course_collection_items;
create policy "Admins delete draft collection items" on public.course_collection_items for delete to authenticated using (public.kraken_is_admin() and exists(select 1 from public.course_collections c where c.id=collection_id and c.status='Draft'));
-- Publishing and Stripe price IDs must be set server-side using service-role access after validating Stripe.
