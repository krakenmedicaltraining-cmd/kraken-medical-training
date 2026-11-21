-- Kraken Membership v21.1. Apply in Supabase SQL Editor.
-- Plans are DRAFT ONLY until server-side Stripe recurring billing is implemented.
begin;
create table if not exists public.membership_plans (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 2 and 100),
 description text not null default '',
 monthly_price_pence integer not null check (monthly_price_pence between 50 and 10000000),
 currency text not null default 'gbp' check (currency = 'gbp'),
 status text not null default 'draft' check (status in ('draft','active','archived')),
 stripe_product_id text,
 stripe_price_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint membership_active_has_stripe_price check (status <> 'active' or stripe_price_id is not null)
);
create table if not exists public.membership_plan_courses (
 plan_id uuid not null references public.membership_plans(id) on delete cascade,
 course_id text not null references public.courses(id) on delete restrict,
 primary key(plan_id,course_id)
);
create table if not exists public.membership_subscriptions (
 id uuid primary key default gen_random_uuid(),
 learner_id uuid not null references auth.users(id),
 plan_id uuid not null references public.membership_plans(id),
 stripe_customer_id text,
 stripe_subscription_id text unique,
 status text not null default 'incomplete' check (status in ('incomplete','trialing','active','past_due','unpaid','canceled','paused')),
 current_period_start timestamptz,
 current_period_end timestamptz,
 cancel_at_period_end boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists membership_subscriptions_learner_idx on public.membership_subscriptions(learner_id);
create index if not exists membership_plan_courses_course_idx on public.membership_plan_courses(course_id);
alter table public.membership_plans enable row level security;
alter table public.membership_plan_courses enable row level security;
alter table public.membership_subscriptions enable row level security;
drop policy if exists "Read public plans or admin plans" on public.membership_plans;
create policy "Read public plans or admin plans" on public.membership_plans for select to anon,authenticated
 using (status='active' or public.kraken_is_admin());
drop policy if exists "Admins create draft plans" on public.membership_plans;
create policy "Admins create draft plans" on public.membership_plans for insert to authenticated
 with check (public.kraken_is_admin() and status='draft' and stripe_price_id is null and stripe_product_id is null);
drop policy if exists "Admins edit draft plans" on public.membership_plans;
create policy "Admins edit draft plans" on public.membership_plans for update to authenticated
 using (public.kraken_is_admin() and status='draft')
 with check (public.kraken_is_admin() and status='draft' and stripe_price_id is null and stripe_product_id is null);
drop policy if exists "Read included courses" on public.membership_plan_courses;
create policy "Read included courses" on public.membership_plan_courses for select to anon,authenticated
 using (public.kraken_is_admin() or exists(select 1 from public.membership_plans p where p.id=plan_id and p.status='active'));
drop policy if exists "Admins add draft membership courses" on public.membership_plan_courses;
create policy "Admins add draft membership courses" on public.membership_plan_courses for insert to authenticated
 with check (public.kraken_is_admin() and exists(select 1 from public.membership_plans p where p.id=plan_id and p.status='draft'));
drop policy if exists "Admins remove draft membership courses" on public.membership_plan_courses;
create policy "Admins remove draft membership courses" on public.membership_plan_courses for delete to authenticated
 using (public.kraken_is_admin() and exists(select 1 from public.membership_plans p where p.id=plan_id and p.status='draft'));
drop policy if exists "Learners read own subscriptions" on public.membership_subscriptions;
create policy "Learners read own subscriptions" on public.membership_subscriptions for select to authenticated
 using (learner_id=(select auth.uid()) or public.kraken_is_admin());
revoke all on public.membership_plans,public.membership_plan_courses,public.membership_subscriptions from anon;
grant select on public.membership_plans,public.membership_plan_courses to anon;
grant select,insert,update on public.membership_plans to authenticated;
grant select,insert,delete on public.membership_plan_courses to authenticated;
grant select on public.membership_subscriptions to authenticated;
-- Subscriptions and Stripe IDs are written ONLY by trusted server-side code.
-- No membership entitlement policy is added to course lessons until webhook processing is secure.
commit;
