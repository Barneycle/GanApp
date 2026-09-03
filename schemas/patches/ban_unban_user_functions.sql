-- Supabase Auth helper functions for banning/unbanning users
-- Run this via the Supabase SQL editor or add to your migrations

drop function if exists public.ban_user(uuid, timestamptz, uuid, text);
drop function if exists public.unban_user(uuid, uuid);

create or replace function public.ban_user(
  target_user_uuid uuid,
  banned_until timestamptz,
  banned_by_uuid uuid,
  ban_reason text default null
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  acting_admin record;
  target_user record;
  banned_until_utc timestamptz := banned_until at time zone 'UTC';
begin
  if banned_until is null then
    return json_build_object('success', false, 'error', 'Banned until timestamp is required');
  end if;

  if banned_until <= now() then
    return json_build_object('success', false, 'error', 'Ban duration must be in the future');
  end if;

  select *
  into acting_admin
  from auth.users
  where id = banned_by_uuid;

  if acting_admin is null
     or coalesce(acting_admin.raw_user_meta_data->>'role', 'participant') <> 'admin' then
    return json_build_object('success', false, 'error', 'Only admins may ban users');
  end if;

  select *
  into target_user
  from auth.users
  where id = target_user_uuid;

  if target_user is null then
    return json_build_object('success', false, 'error', 'Target user not found');
  end if;

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'banned_until', to_char(banned_until_utc, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'ban_reason', ban_reason,
        'is_active', false
      ),
    updated_at = now()
  where id = target_user_uuid;

  return json_build_object('success', true, 'message', 'User banned successfully');
end;
$$;

create or replace function public.unban_user(
  target_user_uuid uuid,
  unbanned_by_uuid uuid
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  acting_admin record;
  target_user record;
  new_meta jsonb;
begin
  select *
  into acting_admin
  from auth.users
  where id = unbanned_by_uuid;

  if acting_admin is null
     or coalesce(acting_admin.raw_user_meta_data->>'role', 'participant') <> 'admin' then
    return json_build_object('success', false, 'error', 'Only admins may unban users');
  end if;

  select *
  into target_user
  from auth.users
  where id = target_user_uuid;

  if target_user is null then
    return json_build_object('success', false, 'error', 'Target user not found');
  end if;

  new_meta := coalesce(target_user.raw_user_meta_data, '{}'::jsonb);
  new_meta := new_meta - 'banned_until';
  new_meta := new_meta - 'ban_reason';
  new_meta := new_meta || jsonb_build_object('is_active', true);

  update auth.users
  set
    raw_user_meta_data = new_meta,
    updated_at = now()
  where id = target_user_uuid;

  return json_build_object('success', true, 'message', 'User unbanned successfully');
end;
$$;

grant execute on function public.ban_user(uuid, timestamptz, uuid, text) to authenticated;
grant execute on function public.unban_user(uuid, uuid) to authenticated;

