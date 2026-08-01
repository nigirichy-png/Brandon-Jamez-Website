-- Add a data-minimized, authenticated email-change request audit event.
-- The function accepts no actor or email input and changes no account state.

begin;

alter table public.audit_events
  drop constraint audit_events_action_check;

alter table public.audit_events
  add constraint audit_events_action_check check (action in (
    'profile.display_name_updated',
    'role.assigned',
    'role.removed',
    'account.blocked',
    'account.restored',
    'account.email_change_requested'
  ));

create function public.record_own_email_change_request()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_roles public.app_role[];
  target_label text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if exists (
    select 1
    from public.account_restrictions
    where user_id = actor_id
      and blocked
  ) then
    raise exception using errcode = '42501', message = 'account_restricted';
  end if;

  select display_name into target_label
  from public.profiles
  where id = actor_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'profile_not_found';
  end if;

  select coalesce(array_agg(role order by role::text), '{}'::public.app_role[])
  into actor_roles
  from public.user_roles
  where user_id = actor_id;

  insert into public.audit_events (
    actor_user_id,
    actor_role_snapshot,
    action,
    target_type,
    target_user_id,
    target_label_snapshot,
    result
  ) values (
    actor_id,
    actor_roles,
    'account.email_change_requested',
    'account',
    actor_id,
    target_label,
    'succeeded'
  );

  return true;
end;
$$;

revoke all on function public.record_own_email_change_request() from public, anon;
grant execute on function public.record_own_email_change_request() to authenticated;

comment on function public.record_own_email_change_request() is
  'Appends an email-free audit event for the authenticated caller after an Auth email-change request.';

commit;
