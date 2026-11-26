begin;
create or replace function public.kraken_my_training_bookings()
returns table(booking_id uuid, course_id uuid, course_title text, starts_at timestamptz, ends_at timestamptz, location_name text, venue_address text, instructor_name text, session_status text, booking_status text, price_pence integer)
language sql stable security definer set search_path=public,pg_temp as $$
 select b.id,c.id,c.title,s.starts_at,s.ends_at,s.location_name,case when b.status='confirmed' then s.venue_address else '' end,s.instructor_name,s.status,b.status,b.price_pence
 from public.in_person_bookings b join public.in_person_sessions s on s.id=b.session_id join public.in_person_courses c on c.id=s.course_id
 where b.learner_id=(select auth.uid()) order by s.starts_at desc,b.created_at desc;
$$;
revoke all on function public.kraken_my_training_bookings() from public,anon,authenticated;
grant execute on function public.kraken_my_training_bookings() to authenticated;
notify pgrst,'reload schema';
commit;