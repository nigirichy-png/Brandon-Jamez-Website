-- Trusted administration and append-oriented audit foundation.
-- This migration does not assign roles, alter entitlements, or modify users.

begin;

create table public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_role_snapshot public.app_role[] not null default '{}'::public.app_role[],
  action text not null check (action in (
    'profile.display_name_updated',
    'role.assigned',
    'role.removed',
    'account.blocked',
    'account.restored'
  )),
  target_type text not null check (target_type in ('account', 'profile')),
  target_user_id uuid references auth.users (id) on delete set null,
  target_label_snapshot text check (
    target_label_snapshot is null
    or char_length(target_label_snapshot) between 1 and 100
  ),
  result text not null check (result in ('succeeded')),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 2048
  )
);

create index audit_events_occurred_at_idx
  on public.audit_events (occurred_at desc, id desc);
create index audit_events_actor_idx
  on public.audit_events (actor_user_id, occurred_at desc);
create index audit_events_target_idx
  on public.audit_events (target_user_id, occurred_at desc);
create index audit_events_action_idx
  on public.audit_events (action, occurred_at desc);

alter table public.audit_events enable row level security;

revoke all on table public.audit_events from anon, authenticated;
revoke all on sequence public.audit_events_id_seq from anon, authenticated;

-- Secret-key/service-role access is reserved for narrowly scoped server reads.
grant select, insert on table public.audit_events to service_role;
grant usage, select on sequence public.audit_events_id_seq to service_role;

create function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role = 'admin'::public.app_role
    )
    and not exists (
      select 1
      from public.account_restrictions
      where user_id = (select auth.uid())
        and blocked
    );
$$;

revoke all on function private.is_active_admin() from public;
grant execute on function private.is_active_admin() to authenticated;

grant select (
  id,
  occurred_at,
  actor_user_id,
  actor_role_snapshot,
  action,
  target_type,
  target_user_id,
  target_label_snapshot,
  result
) on table public.audit_events to authenticated;

create policy "audit_events_select_active_admin"
on public.audit_events
for select
to authenticated
using ((select private.is_active_admin()));

create function public.update_own_display_name(p_display_name text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_name text := pg_catalog.btrim(p_display_name);
  actor_roles public.app_role[];
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if normalized_name is null
    or pg_catalog.char_length(normalized_name) not between 2 and 50
    or normalized_name ~ '[[:cntrl:]]'
    or normalized_name !~ '^[[:alnum:] ''-]+$'
  then
    raise exception using errcode = '22023', message = 'invalid_display_name';
  end if;

  update public.profiles
  set display_name = normalized_name
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
    result
  ) values (
    actor_id,
    actor_roles,
    'profile.display_name_updated',
    'profile',
    actor_id,
    'succeeded'
  );

  return true;
end;
$$;

create function public.admin_assign_role(
  p_target_user_id uuid,
  p_role public.app_role
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_roles public.app_role[];
  target_label text;
  changed boolean := false;
begin
  perform pg_catalog.pg_advisory_xact_lock(42420081001);

  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_target_user_id is null
    or p_role is null
    or not exists (select 1 from auth.users where id = p_target_user_id)
  then
    raise exception using errcode = '22023', message = 'invalid_target_or_role';
  end if;

  select display_name into target_label
  from public.profiles
  where id = p_target_user_id;

  insert into public.user_roles (user_id, role, created_by)
  values (p_target_user_id, p_role, actor_id)
  on conflict (user_id, role) do nothing;
  changed := found;

  if changed then
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
      'role.assigned',
      'account',
      p_target_user_id,
      target_label,
      'succeeded'
    );
  end if;

  return changed;
end;
$$;

create function public.admin_remove_role(
  p_target_user_id uuid,
  p_role public.app_role
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_roles public.app_role[];
  target_label text;
  active_admins bigint;
  target_is_active_admin boolean;
  changed boolean := false;
begin
  perform pg_catalog.pg_advisory_xact_lock(42420081001);

  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_target_user_id is null
    or p_role is null
    or not exists (select 1 from auth.users where id = p_target_user_id)
  then
    raise exception using errcode = '22023', message = 'invalid_target_or_role';
  end if;

  if p_role = 'admin'::public.app_role then
    select count(*) into active_admins
    from public.user_roles roles
    where roles.role = 'admin'::public.app_role
      and not exists (
        select 1
        from public.account_restrictions restrictions
        where restrictions.user_id = roles.user_id
          and restrictions.blocked
      );

    select exists (
      select 1
      from public.user_roles roles
      where roles.user_id = p_target_user_id
        and roles.role = 'admin'::public.app_role
        and not exists (
          select 1
          from public.account_restrictions restrictions
          where restrictions.user_id = roles.user_id
            and restrictions.blocked
        )
    ) into target_is_active_admin;

    if target_is_active_admin and active_admins <= 1 then
      raise exception using errcode = '23514', message = 'last_active_admin_protected';
    end if;
  end if;

  select display_name into target_label
  from public.profiles
  where id = p_target_user_id;

  delete from public.user_roles
  where user_id = p_target_user_id
    and role = p_role;
  changed := found;

  if changed then
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
      'role.removed',
      'account',
      p_target_user_id,
      target_label,
      'succeeded'
    );
  end if;

  return changed;
end;
$$;

create function public.admin_block_account(
  p_target_user_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_roles public.app_role[];
  target_label text;
  normalized_reason text := pg_catalog.btrim(p_reason);
  active_admins bigint;
  target_is_active_admin boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(42420081001);

  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_target_user_id is null
    or not exists (select 1 from auth.users where id = p_target_user_id)
  then
    raise exception using errcode = '22023', message = 'invalid_target';
  end if;

  if normalized_reason is null
    or pg_catalog.char_length(normalized_reason) not between 3 and 500
    or normalized_reason ~ '[[:cntrl:]]'
  then
    raise exception using errcode = '22023', message = 'invalid_restriction_reason';
  end if;

  select count(*) into active_admins
  from public.user_roles roles
  where roles.role = 'admin'::public.app_role
    and not exists (
      select 1
      from public.account_restrictions restrictions
      where restrictions.user_id = roles.user_id
        and restrictions.blocked
    );

  select exists (
    select 1
    from public.user_roles roles
    where roles.user_id = p_target_user_id
      and roles.role = 'admin'::public.app_role
      and not exists (
        select 1
        from public.account_restrictions restrictions
        where restrictions.user_id = roles.user_id
          and restrictions.blocked
      )
  ) into target_is_active_admin;

  if target_is_active_admin and active_admins <= 1 then
    raise exception using errcode = '23514', message = 'last_active_admin_protected';
  end if;

  select display_name into target_label
  from public.profiles
  where id = p_target_user_id;

  insert into public.account_restrictions (
    user_id,
    blocked,
    reason,
    blocked_at,
    blocked_by
  ) values (
    p_target_user_id,
    true,
    normalized_reason,
    now(),
    actor_id
  )
  on conflict (user_id) do update
  set blocked = true,
      reason = excluded.reason,
      blocked_at = excluded.blocked_at,
      blocked_by = excluded.blocked_by;

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
    'account.blocked',
    'account',
    p_target_user_id,
    target_label,
    'succeeded'
  );

  return true;
end;
$$;

create function public.admin_restore_account(p_target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_roles public.app_role[];
  target_label text;
  changed boolean := false;
begin
  perform pg_catalog.pg_advisory_xact_lock(42420081001);

  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_target_user_id is null
    or not exists (select 1 from auth.users where id = p_target_user_id)
  then
    raise exception using errcode = '22023', message = 'invalid_target';
  end if;

  select display_name into target_label
  from public.profiles
  where id = p_target_user_id;

  update public.account_restrictions
  set blocked = false,
      reason = null,
      blocked_at = null,
      blocked_by = null
  where user_id = p_target_user_id
    and blocked;
  changed := found;

  if changed then
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
      'account.restored',
      'account',
      p_target_user_id,
      target_label,
      'succeeded'
    );
  end if;

  return changed;
end;
$$;

revoke all on function public.update_own_display_name(text) from public, anon;
revoke all on function public.admin_assign_role(uuid, public.app_role) from public, anon;
revoke all on function public.admin_remove_role(uuid, public.app_role) from public, anon;
revoke all on function public.admin_block_account(uuid, text) from public, anon;
revoke all on function public.admin_restore_account(uuid) from public, anon;

grant execute on function public.update_own_display_name(text) to authenticated;
grant execute on function public.admin_assign_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_remove_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_block_account(uuid, text) to authenticated;
grant execute on function public.admin_restore_account(uuid) to authenticated;

comment on table public.audit_events is
  'Append-oriented, data-minimized privileged activity history. Never store emails, secrets, provider payloads, raw errors, or credentials.';
comment on function private.is_active_admin() is
  'Validates auth.uid() against the trusted admin role and account restriction state.';
comment on function public.update_own_display_name(text) is
  'Updates only the authenticated caller profile and appends a data-minimized audit event.';
comment on function public.admin_assign_role(uuid, public.app_role) is
  'Assigns one allowlisted role after active-admin validation and appends an audit event.';
comment on function public.admin_remove_role(uuid, public.app_role) is
  'Removes one exact role atomically while protecting the final active admin.';
comment on function public.admin_block_account(uuid, text) is
  'Applies an application-level block atomically while protecting the final active admin.';
comment on function public.admin_restore_account(uuid) is
  'Clears application-level restriction state and its private reason, then appends an audit event.';

commit;
