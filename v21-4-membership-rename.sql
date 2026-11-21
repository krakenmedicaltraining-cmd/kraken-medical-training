-- Allow admins to rename an active membership without modifying Stripe billing fields.
-- The existing draft-only UPDATE policy remains unchanged.
create or replace function public.kraken_rename_active_membership(
  p_plan_id uuid, p_name text, p_description text
) returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_name text := trim(coalesce(p_name,''));
begin
  if auth.uid() is null or not public.kraken_is_admin() then
    raise exception 'Administrator access required';
  end if;
  if length(v_name) not between 2 and 100 then
    raise exception 'Membership name must be 2 to 100 characters';
  end if;
  update public.membership_plans
  set name=v_name, description=coalesce(p_description,''), updated_at=now()
  where id=p_plan_id and status='active';
  if not found then raise exception 'Active membership not found'; end if;
end; $$;
revoke all on function public.kraken_rename_active_membership(uuid,text,text) from public;
grant execute on function public.kraken_rename_active_membership(uuid,text,text) to authenticated;
