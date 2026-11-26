begin;
alter table public.in_person_bookings add column if not exists booking_method text not null default 'stripe' check (booking_method in ('stripe','external','corporate','complimentary'));
alter table public.in_person_bookings add column if not exists manual_reference text;
alter table public.in_person_bookings add column if not exists booked_by uuid references auth.users(id);
create or replace function public.kraken_admin_manual_booking(p_session uuid,p_email text,p_method text,p_amount integer,p_reference text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.in_person_sessions%rowtype; learner uuid; result_id uuid;
begin
 if not coalesce(public.kraken_is_admin(),false) then raise exception 'Administrator required'; end if;
 if p_method is null or p_method not in ('external','corporate','complimentary') or p_amount is null or p_amount not between 0 and 10000000 or (p_method='complimentary' and p_amount<>0) or (p_method<>'complimentary' and (p_amount=0 or nullif(trim(p_reference),'') is null)) then raise exception 'Invalid payment details'; end if;
 select id into learner from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
 if learner is null then raise exception 'Confirmed learner account not found'; end if;
 select * into s from public.in_person_sessions where id=p_session for update;
 if not found or s.status<>'published' or s.starts_at<=now() or s.bookings_closed then raise exception 'Session unavailable or closed'; end if;
 if exists(select 1 from public.in_person_bookings where session_id=p_session and learner_id=learner and status in ('reserved','confirmed')) then raise exception 'Learner already booked or reserved'; end if;
 if (select count(*) from public.in_person_bookings where session_id=p_session and status in ('reserved','confirmed'))>=s.capacity then raise exception 'Session full'; end if;
 insert into public.in_person_bookings(session_id,learner_id,status,price_pence,booking_method,manual_reference,booked_by) values(p_session,learner,'confirmed',p_amount,p_method,left(p_reference,500),auth.uid()) returning id into result_id;
 return result_id;
end; $$;
revoke all on function public.kraken_admin_manual_booking(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.kraken_admin_manual_booking(uuid,text,text,integer,text) to authenticated;
notify pgrst,'reload schema';
commit;