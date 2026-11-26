begin;
create or replace function public.kraken_admin_training_register(p_session uuid)
returns table(booking_id uuid, learner_name text, email text, booking_status text, price_pence integer, booked_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not coalesce(public.kraken_is_admin(),false) then raise exception 'Administrator required'; end if;
 return query select b.id,coalesce(nullif(p.display_name,''),u.email::text,'Learner'),u.email::text,b.status,b.price_pence,b.created_at
 from public.in_person_bookings b join auth.users u on u.id=b.learner_id left join public.profiles p on p.user_id=b.learner_id
 where b.session_id=p_session order by b.created_at;
end; $$;
revoke all on function public.kraken_admin_training_register(uuid) from public,anon,authenticated;
grant execute on function public.kraken_admin_training_register(uuid) to authenticated;
notify pgrst,'reload schema';
commit;