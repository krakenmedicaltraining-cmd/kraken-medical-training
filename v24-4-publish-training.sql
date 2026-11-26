begin;
create or replace function public.kraken_publish_training_session(p_session uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not coalesce(public.kraken_is_admin(),false) then raise exception 'Administrator required'; end if;
 update public.in_person_sessions s set status='published' where s.id=p_session and s.status='draft' and s.starts_at>now()+interval '35 minutes' and s.price_pence>=50 and exists(select 1 from public.in_person_courses c where c.id=s.course_id and c.status='Published');
 if not found then raise exception 'Publish the course first and check session date and price'; end if;
end; $$;
revoke all on function public.kraken_publish_training_session(uuid) from public,anon,authenticated;
grant execute on function public.kraken_publish_training_session(uuid) to authenticated;
notify pgrst,'reload schema';
commit;