-- assign_user_role function for Supabase Auth metadata management
-- Run this via Supabase SQL editor or include in your migrations

drop function if exists public.assign_user_role(uuid, character varying, uuid);
drop function if exists public.assign_user_role(uuid, text, uuid);

create or replace function public.assign_user_role(
  target_user_uuid uuid,
  new_role_text text,
  assigned_by_uuid uuid
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  acting_admin record;
  updated_meta jsonb;
begin
  if new_role_text is null or length(trim(new_role_text)) = 0 then
    return json_build_object(
      'success', false,
      'error', 'Role cannot be empty'
    );
  end if;

  select *
  into acting_admin
  from auth.users
  where id = assigned_by_uuid;

  if acting_admin is null
     or coalesce(acting_admin.raw_user_meta_data->>'role', 'participant') <> 'admin' then
    return json_build_object(
      'success', false,
      'error', 'Only admins may assign roles'
    );
  end if;

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role_text),
    updated_at = now()
  where id = target_user_uuid;

  if not found then
    return json_build_object(
      'success', false,
      'error', 'Target user not found'
    );
  end if;

  return json_build_object(
    'success', true,
    'message', 'Role updated successfully'
  );
end;
$$;

grant execute on function public.assign_user_role(uuid, text, uuid) to authenticated;

