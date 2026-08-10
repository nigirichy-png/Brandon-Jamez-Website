-- LOCAL DRAFT ONLY: do not apply until this migration has been reviewed.
-- Persistent, role-checked moderation cases with status history and audit.

begin;

create type public.moderation_case_severity as enum ('low', 'medium', 'high');
create type public.moderation_case_status as enum (
  'pending',
  'in_review',
  'escalated',
  'reviewed',
  'archived'
);

create function private.is_active_moderator()
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
        and role in ('moderator'::public.app_role, 'admin'::public.app_role)
    )
    and not exists (
      select 1
      from public.account_restrictions
      where user_id = (select auth.uid())
        and blocked
    );
$$;

revoke all on function private.is_active_moderator()
  from public, anon, authenticated, service_role;
grant execute on function private.is_active_moderator() to authenticated;

create table public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null,
  category text not null,
  severity public.moderation_case_severity not null,
  summary text not null,
  evidence_reference text,
  status public.moderation_case_status not null default 'pending',
  assigned_to uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint moderation_cases_title_check check (
    title = pg_catalog.btrim(title)
    and pg_catalog.char_length(title) between 1 and 160
    and title !~ '[[:cntrl:]]'
  ),
  constraint moderation_cases_source_type_check check (
    source_type = pg_catalog.btrim(source_type)
    and pg_catalog.char_length(source_type) between 1 and 80
    and source_type !~ '[[:cntrl:]]'
  ),
  constraint moderation_cases_category_check check (
    category = pg_catalog.btrim(category)
    and pg_catalog.char_length(category) between 1 and 80
    and category !~ '[[:cntrl:]]'
  ),
  constraint moderation_cases_summary_check check (
    summary = pg_catalog.btrim(summary)
    and pg_catalog.char_length(summary) between 1 and 4000
    and summary !~ '[[:cntrl:]]'
  ),
  constraint moderation_cases_evidence_check check (
    evidence_reference is null
    or (
      evidence_reference = pg_catalog.btrim(evidence_reference)
      and pg_catalog.char_length(evidence_reference) between 1 and 500
      and evidence_reference !~ '[[:cntrl:]]'
    )
  )
);

create index moderation_cases_queue_idx
  on public.moderation_cases (status, severity desc, updated_at desc, id);
create index moderation_cases_assignee_idx
  on public.moderation_cases (assigned_to, status, updated_at desc);

create trigger moderation_cases_set_updated_at
before update on public.moderation_cases
for each row execute function private.set_updated_at();

create table public.moderation_case_status_history (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.moderation_cases (id) on delete cascade,
  from_status public.moderation_case_status,
  to_status public.moderation_case_status not null,
  note text,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users (id) on delete set null,
  constraint moderation_case_history_transition_check check (
    from_status is null or from_status <> to_status
  ),
  constraint moderation_case_history_note_check check (
    note is null
    or (
      note = pg_catalog.btrim(note)
      and pg_catalog.char_length(note) between 1 and 500
      and note !~ '[[:cntrl:]]'
    )
  )
);

create index moderation_case_history_case_idx
  on public.moderation_case_status_history (case_id, changed_at desc, id desc);

alter table public.moderation_cases enable row level security;
alter table public.moderation_case_status_history enable row level security;
revoke all on table public.moderation_cases from public, anon, authenticated, service_role;
revoke all on table public.moderation_case_status_history from public, anon, authenticated, service_role;
revoke all on sequence public.moderation_case_status_history_id_seq from public, anon, authenticated, service_role;

create policy "moderation_cases_select_active_moderator"
on public.moderation_cases
for select
to authenticated
using ((select private.is_active_moderator()));

create policy "moderation_case_history_select_active_moderator"
on public.moderation_case_status_history
for select
to authenticated
using ((select private.is_active_moderator()));

alter table public.audit_events drop constraint audit_events_action_check;
alter table public.audit_events add constraint audit_events_action_check check (action in (
  'profile.display_name_updated',
  'role.assigned',
  'role.removed',
  'account.blocked',
  'account.restored',
  'account.email_change_requested',
  'cms.video_created',
  'cms.video_updated',
  'cms.video_published',
  'cms.video_unpublished',
  'cms.video_deleted',
  'cms.video_featured',
  'cms.video_unfeatured',
  'cms.video_reordered',
  'subscription.checkout_started',
  'subscription.portal_opened',
  'subscription.state_synced',
  'subscriber.post_created',
  'subscriber.post_updated',
  'subscriber.post_published',
  'subscriber.post_unpublished',
  'subscriber.post_deleted',
  'moderation.case_created',
  'moderation.case_updated',
  'moderation.case_assigned',
  'moderation.case_unassigned',
  'moderation.case_status_changed',
  'moderation.case_deleted'
));

alter table public.audit_events drop constraint audit_events_target_type_check;
alter table public.audit_events add constraint audit_events_target_type_check check (
  target_type in ('account', 'profile', 'cms_video', 'subscriber_post', 'moderation_case')
);

alter table public.audit_events drop constraint audit_events_target_reference_check;
alter table public.audit_events add constraint audit_events_target_reference_check check (
  (target_type in ('cms_video', 'subscriber_post', 'moderation_case') and target_resource_id is not null and target_user_id is null)
  or (target_type in ('account', 'profile') and target_resource_id is null)
);

create function private.validate_moderation_case_fields(
  p_title text,
  p_source_type text,
  p_category text,
  p_severity public.moderation_case_severity,
  p_summary text,
  p_evidence_reference text
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_title is null or pg_catalog.char_length(p_title) not between 1 and 160 or p_title ~ '[[:cntrl:]]'
  then raise exception using errcode = '22023', message = 'invalid_moderation_case_title'; end if;
  if p_source_type is null or pg_catalog.char_length(p_source_type) not between 1 and 80 or p_source_type ~ '[[:cntrl:]]'
  then raise exception using errcode = '22023', message = 'invalid_moderation_case_source'; end if;
  if p_category is null or pg_catalog.char_length(p_category) not between 1 and 80 or p_category ~ '[[:cntrl:]]'
  then raise exception using errcode = '22023', message = 'invalid_moderation_case_category'; end if;
  if p_severity is null
  then raise exception using errcode = '22023', message = 'invalid_moderation_case_severity'; end if;
  if p_summary is null or pg_catalog.char_length(p_summary) not between 1 and 4000 or p_summary ~ '[[:cntrl:]]'
  then raise exception using errcode = '22023', message = 'invalid_moderation_case_summary'; end if;
  if p_evidence_reference is not null
    and (pg_catalog.char_length(p_evidence_reference) not between 1 and 500 or p_evidence_reference ~ '[[:cntrl:]]')
  then raise exception using errcode = '22023', message = 'invalid_moderation_case_evidence'; end if;
end;
$$;

revoke all on function private.validate_moderation_case_fields(
  text, text, text, public.moderation_case_severity, text, text
) from public, anon, authenticated, service_role;

create function private.append_moderation_audit(
  p_actor_id uuid,
  p_action text,
  p_case_id uuid,
  p_title text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  actor_roles public.app_role[];
begin
  select coalesce(array_agg(role order by role::text), '{}'::public.app_role[])
  into actor_roles
  from public.user_roles
  where user_id = p_actor_id;

  insert into public.audit_events (
    actor_user_id, actor_role_snapshot, action, target_type,
    target_resource_id, target_label_snapshot, result, metadata
  ) values (
    p_actor_id, actor_roles, p_action, 'moderation_case', p_case_id,
    pg_catalog.left(p_title, 100), 'succeeded', coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function private.append_moderation_audit(uuid, text, uuid, text, jsonb)
  from public, anon, authenticated, service_role;

create function public.moderator_list_cases()
returns table (
  id uuid,
  title text,
  source_type text,
  category text,
  severity public.moderation_case_severity,
  summary text,
  evidence_reference text,
  status public.moderation_case_status,
  assigned_to_current_user boolean,
  assigned_to_label text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_active_moderator() then
    raise exception using errcode = '42501', message = 'active_moderator_required';
  end if;

  return query
  select cases.id, cases.title, cases.source_type, cases.category,
    cases.severity, cases.summary, cases.evidence_reference, cases.status,
    cases.assigned_to = (select auth.uid()),
    case when cases.assigned_to is null then null else coalesce(profiles.display_name, 'Assigned staff') end,
    cases.created_at, cases.updated_at
  from public.moderation_cases as cases
  left join public.profiles as profiles on profiles.id = cases.assigned_to
  order by
    case cases.status when 'pending' then 0 when 'in_review' then 1 when 'escalated' then 2 when 'reviewed' then 3 else 4 end,
    cases.severity desc,
    cases.updated_at desc,
    cases.id
  limit 200;
end;
$$;

create function public.moderator_list_case_history()
returns table (
  id bigint,
  case_id uuid,
  from_status public.moderation_case_status,
  to_status public.moderation_case_status,
  note text,
  changed_at timestamptz,
  changed_by_label text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_active_moderator() then
    raise exception using errcode = '42501', message = 'active_moderator_required';
  end if;

  return query
  select history.id, history.case_id, history.from_status, history.to_status,
    history.note, history.changed_at,
    case when history.changed_by is null then 'Former staff' else coalesce(profiles.display_name, 'Staff') end
  from public.moderation_case_status_history as history
  join public.moderation_cases as cases on cases.id = history.case_id
  left join public.profiles as profiles on profiles.id = history.changed_by
  order by history.changed_at desc, history.id desc
  limit 1000;
end;
$$;

create function public.moderator_create_case(
  p_title text,
  p_source_type text,
  p_category text,
  p_severity public.moderation_case_severity,
  p_summary text,
  p_evidence_reference text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_title text := pg_catalog.btrim(p_title);
  normalized_source text := pg_catalog.btrim(p_source_type);
  normalized_category text := pg_catalog.btrim(p_category);
  normalized_summary text := pg_catalog.btrim(p_summary);
  normalized_evidence text := nullif(pg_catalog.btrim(p_evidence_reference), '');
  case_id uuid;
begin
  if not private.is_active_moderator() then
    raise exception using errcode = '42501', message = 'active_moderator_required';
  end if;
  if p_case_id is null or p_expected_updated_at is null then
    raise exception using errcode = '22023', message = 'invalid_moderation_case_version';
  end if;
  perform private.validate_moderation_case_fields(
    normalized_title, normalized_source, normalized_category,
    p_severity, normalized_summary, normalized_evidence
  );

  insert into public.moderation_cases (
    title, source_type, category, severity, summary, evidence_reference,
    created_by, updated_by
  ) values (
    normalized_title, normalized_source, normalized_category, p_severity,
    normalized_summary, normalized_evidence, actor_id, actor_id
  ) returning id into case_id;

  insert into public.moderation_case_status_history (
    case_id, from_status, to_status, changed_by
  ) values (case_id, null, 'pending', actor_id);

  perform private.append_moderation_audit(
    actor_id, 'moderation.case_created', case_id, normalized_title
  );
  return case_id;
end;
$$;

create function public.moderator_update_case(
  p_case_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_source_type text,
  p_category text,
  p_severity public.moderation_case_severity,
  p_summary text,
  p_evidence_reference text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_title text := pg_catalog.btrim(p_title);
  normalized_source text := pg_catalog.btrim(p_source_type);
  normalized_category text := pg_catalog.btrim(p_category);
  normalized_summary text := pg_catalog.btrim(p_summary);
  normalized_evidence text := nullif(pg_catalog.btrim(p_evidence_reference), '');
  case_row public.moderation_cases%rowtype;
begin
  if not private.is_active_moderator() then
    raise exception using errcode = '42501', message = 'active_moderator_required';
  end if;
  perform private.validate_moderation_case_fields(
    normalized_title, normalized_source, normalized_category,
    p_severity, normalized_summary, normalized_evidence
  );

  select * into case_row from public.moderation_cases where id = p_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'moderation_case_not_found'; end if;
  if case_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_moderation_case_version';
  end if;
  if case_row.title = normalized_title
    and case_row.source_type = normalized_source
    and case_row.category = normalized_category
    and case_row.severity = p_severity
    and case_row.summary = normalized_summary
    and case_row.evidence_reference is not distinct from normalized_evidence
  then return false; end if;

  update public.moderation_cases
  set title = normalized_title, source_type = normalized_source,
      category = normalized_category, severity = p_severity,
      summary = normalized_summary, evidence_reference = normalized_evidence,
      updated_by = actor_id
  where id = p_case_id;

  perform private.append_moderation_audit(
    actor_id, 'moderation.case_updated', p_case_id, normalized_title
  );
  return true;
end;
$$;

create function public.moderator_set_case_assignment(
  p_case_id uuid,
  p_expected_updated_at timestamptz,
  p_assign_to_self boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  case_row public.moderation_cases%rowtype;
begin
  if not private.is_active_moderator() then
    raise exception using errcode = '42501', message = 'active_moderator_required';
  end if;
  if p_case_id is null or p_expected_updated_at is null or p_assign_to_self is null then
    raise exception using errcode = '22023', message = 'invalid_moderation_assignment';
  end if;
  select * into case_row from public.moderation_cases where id = p_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'moderation_case_not_found'; end if;
  if case_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_moderation_case_version';
  end if;

  if p_assign_to_self then
    if case_row.assigned_to = actor_id then return false; end if;
    if case_row.assigned_to is not null then
      raise exception using errcode = '23514', message = 'moderation_case_already_assigned';
    end if;
  else
    if case_row.assigned_to is null then return false; end if;
    if case_row.assigned_to <> actor_id and not private.is_active_admin() then
      raise exception using errcode = '42501', message = 'moderation_case_assignment_owner_required';
    end if;
  end if;

  update public.moderation_cases
  set assigned_to = case when p_assign_to_self then actor_id else null end,
      updated_by = actor_id
  where id = p_case_id;

  perform private.append_moderation_audit(
    actor_id,
    case when p_assign_to_self then 'moderation.case_assigned' else 'moderation.case_unassigned' end,
    p_case_id,
    case_row.title
  );
  return true;
end;
$$;

create function public.moderator_set_case_status(
  p_case_id uuid,
  p_expected_updated_at timestamptz,
  p_status public.moderation_case_status,
  p_note text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_note text := nullif(pg_catalog.btrim(p_note), '');
  case_row public.moderation_cases%rowtype;
begin
  if not private.is_active_moderator() then
    raise exception using errcode = '42501', message = 'active_moderator_required';
  end if;
  if p_case_id is null or p_expected_updated_at is null or p_status is null
    or (normalized_note is not null and (pg_catalog.char_length(normalized_note) > 500 or normalized_note ~ '[[:cntrl:]]'))
  then raise exception using errcode = '22023', message = 'invalid_moderation_status_change'; end if;

  select * into case_row from public.moderation_cases where id = p_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'moderation_case_not_found'; end if;
  if case_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_moderation_case_version';
  end if;
  if case_row.status = p_status then return false; end if;

  update public.moderation_cases
  set status = p_status, updated_by = actor_id
  where id = p_case_id;

  insert into public.moderation_case_status_history (
    case_id, from_status, to_status, note, changed_by
  ) values (p_case_id, case_row.status, p_status, normalized_note, actor_id);

  perform private.append_moderation_audit(
    actor_id, 'moderation.case_status_changed', p_case_id, case_row.title,
    pg_catalog.jsonb_build_object('from_status', case_row.status, 'to_status', p_status)
  );
  return true;
end;
$$;

create function public.moderator_delete_case(
  p_case_id uuid,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  case_row public.moderation_cases%rowtype;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;
  if p_case_id is null or p_expected_updated_at is null then
    raise exception using errcode = '22023', message = 'invalid_moderation_delete';
  end if;
  select * into case_row from public.moderation_cases where id = p_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'moderation_case_not_found'; end if;
  if case_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_moderation_case_version';
  end if;
  if case_row.status <> 'archived'::public.moderation_case_status then
    raise exception using errcode = '23514', message = 'archived_moderation_case_required';
  end if;

  perform private.append_moderation_audit(
    actor_id, 'moderation.case_deleted', p_case_id, case_row.title,
    pg_catalog.jsonb_build_object('final_status', case_row.status)
  );
  delete from public.moderation_cases where id = p_case_id;
  return true;
end;
$$;

revoke all on function public.moderator_list_cases() from public, anon, authenticated, service_role;
revoke all on function public.moderator_list_case_history() from public, anon, authenticated, service_role;
revoke all on function public.moderator_create_case(text, text, text, public.moderation_case_severity, text, text) from public, anon, authenticated, service_role;
revoke all on function public.moderator_update_case(uuid, timestamptz, text, text, text, public.moderation_case_severity, text, text) from public, anon, authenticated, service_role;
revoke all on function public.moderator_set_case_assignment(uuid, timestamptz, boolean) from public, anon, authenticated, service_role;
revoke all on function public.moderator_set_case_status(uuid, timestamptz, public.moderation_case_status, text) from public, anon, authenticated, service_role;
revoke all on function public.moderator_delete_case(uuid, timestamptz) from public, anon, authenticated, service_role;

grant execute on function public.moderator_list_cases() to authenticated;
grant execute on function public.moderator_list_case_history() to authenticated;
grant execute on function public.moderator_create_case(text, text, text, public.moderation_case_severity, text, text) to authenticated;
grant execute on function public.moderator_update_case(uuid, timestamptz, text, text, text, public.moderation_case_severity, text, text) to authenticated;
grant execute on function public.moderator_set_case_assignment(uuid, timestamptz, boolean) to authenticated;
grant execute on function public.moderator_set_case_status(uuid, timestamptz, public.moderation_case_status, text) to authenticated;
grant execute on function public.moderator_delete_case(uuid, timestamptz) to authenticated;

comment on table public.moderation_cases is
  'Website-internal moderation cases. Direct table access is denied; active moderators use checked RPCs.';
comment on table public.moderation_case_status_history is
  'Append-only status transitions for moderation cases. Changes are written only by checked RPCs.';

commit;
