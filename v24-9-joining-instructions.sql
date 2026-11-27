begin;
create table public.training_joining_templates(id uuid primary key default gen_random_uuid(),name text not null unique, instructions text not null check(length(instructions)<=20000));
create table public.training_joining_instructions(session_id uuid primary key references public.in_person_sessions(id) on delete cascade,draft text not null default '' check(length(draft)<=20000),published_text text check(length(published_text)<=20000));
alter table public.training_joining_templates enable row level security;
alter table public.training_joining_instructions enable row level security;
revoke all on public.training_joining_templates,public.training_joining_instructions from public,anon,authenticated;
grant select,insert,update,delete on public.training_joining_templates,public.training_joining_instructions to authenticated;
create policy admin_templates on public.training_joining_templates for all to authenticated using(public.kraken_is_admin()) with check(public.kraken_is_admin());
create policy admin_instructions on public.training_joining_instructions for all to authenticated using(public.kraken_is_admin()) with check(public.kraken_is_admin());
create function public.kraken_my_joining_instructions(p_booking uuid) returns text language sql stable security definer set search_path=public,pg_temp as $$
select j.published_text from public.in_person_bookings b join public.training_joining_instructions j on j.session_id=b.session_id join public.in_person_sessions s on s.id=b.session_id where b.id=p_booking and b.learner_id=auth.uid() and b.status='confirmed' and s.status='published';
$$;
revoke all on function public.kraken_my_joining_instructions(uuid) from public,anon,authenticated;
grant execute on function public.kraken_my_joining_instructions(uuid) to authenticated;
notify pgrst,'reload schema';
commit;