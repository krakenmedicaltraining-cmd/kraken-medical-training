-- Kraken Collections v18.1 compatibility with Payments Worker v4.2.
-- Run after v18-collections.sql. No existing collection data is deleted.
-- Worker v4.2 reads collection_courses(course_id, sort_order), while
-- admin v18 writes course_collection_items(course_id, position).
create or replace view public.collection_courses
with (security_invoker = true)
as select collection_id, course_id, position as sort_order
from public.course_collection_items;
-- Worker reads via service-role key; published items remain governed by RLS for other clients.
alter table public.course_collections add column if not exists slug text;
update public.course_collections set slug = id::text where slug is null;
create unique index if not exists course_collections_slug_key on public.course_collections(slug);
-- Existing v18 policies intentionally keep browser clients from publishing or changing Stripe IDs.
