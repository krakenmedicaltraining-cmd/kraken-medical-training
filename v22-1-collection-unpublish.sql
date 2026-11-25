begin;
drop policy if exists "Admins update draft collections" on public.course_collections;
create policy "Admins update draft collections" on public.course_collections
for update to authenticated using (public.kraken_is_admin())
with check (public.kraken_is_admin() and status='Draft');
commit;
