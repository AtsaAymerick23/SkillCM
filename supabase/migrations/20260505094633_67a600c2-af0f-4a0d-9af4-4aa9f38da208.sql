
-- set_updated_at already only used as trigger; restrict execution and set search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
-- has_role is used by RLS policies, keep EXECUTE for authenticated only
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
