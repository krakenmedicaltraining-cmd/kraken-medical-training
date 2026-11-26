begin;
alter table public.in_person_sessions add column if not exists bookings_closed boolean not null default false;
create or replace function public.kraken_reserve_training_seat(p_session uuid,p_learner uuid)
returns public.in_person_bookings language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.in_person_sessions%rowtype; b public.in_person_bookings%rowtype;
begin
 select * into s from public.in_person_sessions where id=p_session for update;
 if not found or s.status<>'published' or s.bookings_closed or s.starts_at<=now()+interval '35 minutes' or s.price_pence<50 then raise exception 'Session unavailable'; end if;
 if not exists(select 1 from public.in_person_courses where id=s.course_id and status='Published') then raise exception 'Course unavailable'; end if;
 if exists(select 1 from public.in_person_bookings where session_id=p_session and learner_id=p_learner and status in ('reserved','confirmed')) then raise exception 'Existing booking or reservation'; end if;
 if (select count(*) from public.in_person_bookings where session_id=p_session and status in ('reserved','confirmed'))>=s.capacity then raise exception 'Session full'; end if;
 insert into public.in_person_bookings(session_id,learner_id,status,reserved_until,price_pence) values(p_session,p_learner,'reserved',now()+interval '35 minutes',s.price_pence) returning * into b;
 return b;
end; $$;
create or replace function public.kraken_training_availability(p_course uuid)
returns table(session_id uuid,starts_at timestamptz,ends_at timestamptz,location_name text,instructor_name text,price_pence integer,capacity integer,available_spaces integer)
language sql stable security definer set search_path=public,pg_temp as $$
 select s.id,s.starts_at,s.ends_at,s.location_name,s.instructor_name,s.price_pence,s.capacity,greatest(0,s.capacity-(select count(*)::integer from public.in_person_bookings b where b.session_id=s.id and b.status in ('reserved','confirmed')))
 from public.in_person_sessions s join public.in_person_courses c on c.id=s.course_id where s.course_id=p_course and s.status='published' and not s.bookings_closed and c.status='Published' and s.starts_at>now() order by s.starts_at;
$$;
create or replace function public.kraken_manage_training_session(p_session uuid,p_capacity integer,p_closed boolean,p_instructor text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.in_person_sessions%rowtype;
begin
 if not coalesce(public.kraken_is_admin(),false) then raise exception 'Administrator required'; end if;
 select * into s from public.in_person_sessions where id=p_session for update;
 if not found or s.status<>'published' or s.starts_at<=now() then raise exception 'Future published session required'; end if;
 if p_capacity is null or p_capacity not between 1 and 1000 or p_closed is null then raise exception 'Invalid capacity or booking state'; end if;
 if p_capacity<(select count(*) from public.in_person_bookings where session_id=p_session and status in ('reserved','confirmed')) then raise exception 'Capacity cannot be below occupied seats'; end if;
 update public.in_person_sessions set capacity=p_capacity,bookings_closed=p_closed,instructor_name=coalesce(p_instructor,'') where id=p_session;
end; $$;
revoke all on function public.kraken_manage_training_session(uuid,integer,boolean,text) from public,anon,authenticated;
grant execute on function public.kraken_manage_training_session(uuid,integer,boolean,text) to authenticated;
notify pgrst,'reload schema';
commit;