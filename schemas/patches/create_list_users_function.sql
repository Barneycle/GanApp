-- list_users function for Supabase Auth admin tooling
-- Run this via Supabase SQL editor or include in your migrations

create or replace function public.list_users(
  requested_by_uuid uuid,
  active_only boolean default false,
  role_filter text default null
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_record record;
  result json;
begin
  select *
  into current_user_record
  from auth.users
  where id = requested_by_uuid;

  if current_user_record is null
     or coalesce(current_user_record.raw_user_meta_data->>'role', 'participant') <> 'admin' then
    return json_build_object(
      'success', false,
      'error', 'Only admins can list users'
    );
  end if;

  with user_data as (
    select
      u.id,
      u.email,
      u.created_at,
      u.updated_at,
      u.last_sign_in_at,
      u.raw_user_meta_data->>'first_name' as first_name,
      u.raw_user_meta_data->>'last_name' as last_name,
      u.raw_user_meta_data->>'role' as role,
      u.raw_user_meta_data->>'user_type' as user_type,
      u.raw_user_meta_data->>'organization' as organization,
      (u.raw_user_meta_data->>'is_active')::boolean as is_active,
      (u.raw_user_meta_data->>'banned_until') as banned_until
    from auth.users u
  ),
  filtered as (
    select *
    from user_data
    where case
            when role_filter is not null
              then coalesce(role, 'participant') = role_filter
            else true
          end
      and case
            when active_only then coalesce(is_active, true) = true
            else true
          end
  )
  select json_agg(
           json_build_object(
             'id', id,
             'email', email,
             'first_name', first_name,
             'last_name', last_name,
             'role', coalesce(role, 'participant'),
             'user_type', user_type,
             'organization', organization,
             'is_active', coalesce(is_active, true),
             'banned_until', banned_until,
             'created_at', created_at,
             'updated_at', updated_at,
             'last_sign_in_at', last_sign_in_at
           )
         )
  into result
  from filtered;

  return json_build_object(
    'success', true,
    'users', coalesce(result, '[]'::json)
  );
end;
$$;

grant execute on function public.list_users(uuid, boolean, text) to authenticated;

