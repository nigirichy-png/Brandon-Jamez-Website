-- LOCAL DRAFT ONLY: do not apply until this migration has been reviewed.
-- Persisted live-edit documents for public pages. One draft row and one
-- published row per route. The document is presentation state only: text,
-- links, image references, style values and layout placement. It never stores
-- credentials, tokens, playback secrets, personal data, or markup. Application
-- code sanitizes every document before it reaches this table, and the checks
-- here are an independent second boundary rather than the only one.

begin;

create type public.site_content_state as enum (
  'draft',
  'published'
);

-- Route keys are fixed internal identifiers chosen by the application, not
-- user-supplied URLs. The check deliberately accepts a small absolute-path
-- subset and rejects traversal, schemes, authorities, queries and fragments.
create function private.is_valid_site_route_key(p_route_key text)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return p_route_key = pg_catalog.btrim(p_route_key)
    and pg_catalog.char_length(p_route_key) between 1 and 120
    and p_route_key ~ '^/[a-z0-9/_-]*$'
    and pg_catalog.strpos(p_route_key, '//') = 0
    and pg_catalog.strpos(p_route_key, '..') = 0
    and (p_route_key = '/' or pg_catalog.right(p_route_key, 1) <> '/');
end;
$$;

revoke all on function private.is_valid_site_route_key(text)
  from public, anon, authenticated;

create table public.site_page_content (
  id uuid primary key default gen_random_uuid(),
  route_key text not null,
  state public.site_content_state not null,
  schema_version integer not null,
  document jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint site_page_content_route_state_key unique (route_key, state),
  constraint site_page_content_route_key_check check (
    private.is_valid_site_route_key(route_key)
  ),
  constraint site_page_content_schema_version_check check (
    schema_version between 1 and 1000
  ),
  constraint site_page_content_version_check check (
    version between 1 and 2000000000
  ),
  -- A JSON object is the only accepted shape, and the serialized size is
  -- bounded so a compromised or buggy client cannot store an unbounded blob
  -- that later has to be parsed on every public request.
  constraint site_page_content_document_object_check check (
    pg_catalog.jsonb_typeof(document) = 'object'
  ),
  constraint site_page_content_document_size_check check (
    pg_catalog.octet_length(document::text) <= 262144
  )
);

create index site_page_content_published_idx
  on public.site_page_content (route_key)
  where state = 'published'::public.site_content_state;

create trigger site_page_content_set_updated_at
before update on public.site_page_content
for each row execute function private.set_updated_at();

comment on table public.site_page_content is
  'Presentation-only live-edit documents per public route. One draft and one published row per route; no credentials, personal data, or markup.';
comment on column public.site_page_content.route_key is
  'Fixed internal route identifier chosen by the application, restricted to a safe absolute-path subset.';
comment on column public.site_page_content.document is
  'Sanitized editor snapshot as a JSON object, bounded to 256 KB serialized.';
comment on column public.site_page_content.version is
  'Monotonic per-row revision used for optimistic concurrency; callers must send the version they last read.';
comment on column public.site_page_content.updated_by is
  'Most recent editing actor when the Auth user still exists; retained content sets this to null after user deletion.';

alter table public.site_page_content enable row level security;

revoke all on table public.site_page_content from anon, authenticated;

-- Defense in depth for any future grant. Public reads go through the RPC
-- below, so callers never receive draft rows or actor identifiers.
create policy "site_page_content_select_published"
on public.site_page_content
for select
to anon, authenticated
using (state = 'published'::public.site_content_state);

create policy "site_page_content_select_active_admin"
on public.site_page_content
for select
to authenticated
using ((select private.is_active_admin()));

-- Extend the existing audit vocabulary. A site page has no target user, and
-- its resource identifier is the stable row id rather than the route text.
alter table public.audit_events drop constraint audit_events_action_check;
alter table public.audit_events add constraint audit_events_action_check check (action in (
  'profile.display_name_updated', 'role.assigned', 'role.removed', 'account.blocked', 'account.restored',
  'account.email_change_requested', 'cms.video_created', 'cms.video_updated', 'cms.video_published',
  'cms.video_unpublished', 'cms.video_deleted', 'cms.video_featured', 'cms.video_unfeatured', 'cms.video_reordered',
  'subscription.checkout_started', 'subscription.portal_opened', 'subscription.state_synced',
  'subscriber.post_created', 'subscriber.post_updated', 'subscriber.post_published', 'subscriber.post_unpublished', 'subscriber.post_deleted',
  'subscriber.bunny_video_upload_started', 'subscriber.bunny_video_updated', 'subscriber.bunny_video_published',
  'subscriber.bunny_video_unpublished', 'subscriber.bunny_video_removed',
  'moderation.case_created', 'moderation.case_updated', 'moderation.case_assigned', 'moderation.case_unassigned',
  'moderation.case_status_changed', 'moderation.case_deleted',
  'cms.event_created', 'cms.event_updated', 'cms.event_published', 'cms.event_unpublished', 'cms.event_archived', 'cms.event_restored', 'cms.event_deleted',
  'live.session_configured', 'live.session_status_changed', 'live.chat_message_deleted', 'live.chat_user_timed_out', 'live.chat_user_banned', 'live.chat_user_unrestricted',
  'youtube.chat_message_deleted', 'youtube.chat_user_timed_out', 'youtube.chat_user_hidden', 'youtube.chat_message_sent',
  'site.page_draft_saved', 'site.page_published', 'site.page_draft_discarded'
));

alter table public.audit_events drop constraint audit_events_target_type_check;
alter table public.audit_events add constraint audit_events_target_type_check check (
  target_type in (
    'account', 'profile', 'cms_video', 'subscriber_post', 'subscriber_video',
    'moderation_case', 'cms_event', 'live_session', 'youtube_live_chat', 'site_page'
  )
);

alter table public.audit_events drop constraint audit_events_target_reference_check;
alter table public.audit_events add constraint audit_events_target_reference_check check (
  (target_type in ('cms_video', 'subscriber_post', 'subscriber_video', 'moderation_case', 'cms_event', 'live_session', 'site_page')
    and target_resource_id is not null and target_user_id is null)
  or (target_type in ('account', 'profile') and target_resource_id is null)
  or (target_type = 'youtube_live_chat' and target_resource_id is null and target_user_id is null)
);

create function private.append_site_page_audit(
  p_actor_id uuid,
  p_action text,
  p_row_id uuid,
  p_route_key text,
  p_metadata jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  actor_roles public.app_role[];
  safe_label text := pg_catalog.left(pg_catalog.btrim(p_route_key), 100);
begin
  select coalesce(array_agg(role order by role::text), '{}'::public.app_role[])
  into actor_roles
  from public.user_roles
  where user_id = p_actor_id;

  insert into public.audit_events (
    actor_user_id,
    actor_role_snapshot,
    action,
    target_type,
    target_resource_id,
    target_label_snapshot,
    result,
    metadata
  ) values (
    p_actor_id,
    actor_roles,
    p_action,
    'site_page',
    p_row_id,
    safe_label,
    'succeeded',
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function private.append_site_page_audit(uuid, text, uuid, text, jsonb)
  from public, anon, authenticated;

-- Safe public read surface: the published document only, with no actor
-- identifiers and no access to the draft row.
create function public.get_published_site_page(p_route_key text)
returns table (
  document jsonb,
  schema_version integer,
  version integer,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select content.document, content.schema_version, content.version, content.updated_at
  from public.site_page_content as content
  where content.route_key = p_route_key
    and content.state = 'published'::public.site_content_state;
$$;

create function public.admin_get_site_page(p_route_key text)
returns table (
  state public.site_content_state,
  document jsonb,
  schema_version integer,
  version integer,
  updated_at timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  return query
    select content.state, content.document, content.schema_version, content.version, content.updated_at
    from public.site_page_content as content
    where content.route_key = p_route_key;
end;
$$;

-- Optimistic concurrency: callers send the version they last read. Zero means
-- "I believe no draft exists yet", so a concurrently created draft is rejected
-- instead of silently overwritten.
create function public.admin_save_site_page_draft(
  p_route_key text,
  p_schema_version integer,
  p_document jsonb,
  p_expected_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  draft_row public.site_page_content%rowtype;
  next_version integer;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_route_key is null or not private.is_valid_site_route_key(p_route_key) then
    raise exception using errcode = '22023', message = 'invalid_route_key';
  end if;

  if p_document is null or pg_catalog.jsonb_typeof(p_document) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_document';
  end if;

  if p_expected_version is null or p_expected_version < 0 then
    raise exception using errcode = '22023', message = 'invalid_expected_version';
  end if;

  select * into draft_row
  from public.site_page_content
  where route_key = p_route_key
    and state = 'draft'::public.site_content_state
  for update;

  if not found then
    if p_expected_version <> 0 then
      raise exception using errcode = '40001', message = 'stale_site_page_version';
    end if;

    insert into public.site_page_content (route_key, state, schema_version, document, version, updated_by)
    values (p_route_key, 'draft'::public.site_content_state, p_schema_version, p_document, 1, actor_id)
    returning id, version into draft_row.id, next_version;
  else
    if draft_row.version <> p_expected_version then
      raise exception using errcode = '40001', message = 'stale_site_page_version';
    end if;

    next_version := draft_row.version + 1;

    update public.site_page_content
    set schema_version = p_schema_version,
        document = p_document,
        version = next_version,
        updated_by = actor_id
    where id = draft_row.id;
  end if;

  perform private.append_site_page_audit(
    actor_id,
    'site.page_draft_saved',
    draft_row.id,
    p_route_key,
    pg_catalog.jsonb_build_object('version', next_version)
  );

  return next_version;
end;
$$;

create function public.admin_publish_site_page(
  p_route_key text,
  p_expected_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  draft_row public.site_page_content%rowtype;
  published_row public.site_page_content%rowtype;
  next_version integer;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_route_key is null or not private.is_valid_site_route_key(p_route_key) then
    raise exception using errcode = '22023', message = 'invalid_route_key';
  end if;

  select * into draft_row
  from public.site_page_content
  where route_key = p_route_key
    and state = 'draft'::public.site_content_state
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'site_page_draft_not_found';
  end if;

  if p_expected_version is null or draft_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'stale_site_page_version';
  end if;

  select * into published_row
  from public.site_page_content
  where route_key = p_route_key
    and state = 'published'::public.site_content_state
  for update;

  if not found then
    insert into public.site_page_content (route_key, state, schema_version, document, version, updated_by)
    values (p_route_key, 'published'::public.site_content_state, draft_row.schema_version, draft_row.document, 1, actor_id)
    returning id, version into published_row.id, next_version;
  else
    next_version := published_row.version + 1;

    update public.site_page_content
    set schema_version = draft_row.schema_version,
        document = draft_row.document,
        version = next_version,
        updated_by = actor_id
    where id = published_row.id;
  end if;

  perform private.append_site_page_audit(
    actor_id,
    'site.page_published',
    published_row.id,
    p_route_key,
    pg_catalog.jsonb_build_object('version', next_version, 'from_draft_version', draft_row.version)
  );

  return next_version;
end;
$$;

-- Discarding removes the draft only. The published document is never touched,
-- so an accidental discard cannot take the live page down.
create function public.admin_discard_site_page_draft(p_route_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  draft_row public.site_page_content%rowtype;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_route_key is null or not private.is_valid_site_route_key(p_route_key) then
    raise exception using errcode = '22023', message = 'invalid_route_key';
  end if;

  delete from public.site_page_content
  where route_key = p_route_key
    and state = 'draft'::public.site_content_state
  returning * into draft_row;

  if not found then
    return false;
  end if;

  perform private.append_site_page_audit(
    actor_id,
    'site.page_draft_discarded',
    draft_row.id,
    p_route_key,
    pg_catalog.jsonb_build_object('version', draft_row.version)
  );

  return true;
end;
$$;

revoke all on function public.get_published_site_page(text) from public;
revoke all on function public.admin_get_site_page(text) from public;
revoke all on function public.admin_save_site_page_draft(text, integer, jsonb, integer) from public;
revoke all on function public.admin_publish_site_page(text, integer) from public;
revoke all on function public.admin_discard_site_page_draft(text) from public;

grant execute on function public.get_published_site_page(text) to anon, authenticated;
grant execute on function public.admin_get_site_page(text) to authenticated;
grant execute on function public.admin_save_site_page_draft(text, integer, jsonb, integer) to authenticated;
grant execute on function public.admin_publish_site_page(text, integer) to authenticated;
grant execute on function public.admin_discard_site_page_draft(text) to authenticated;

comment on function public.get_published_site_page(text) is
  'Published presentation document for one route. Returns no draft content and no actor identifiers.';
comment on function public.admin_get_site_page(text) is
  'Draft and published rows for one route, restricted to an active administrator.';
comment on function public.admin_save_site_page_draft(text, integer, jsonb, integer) is
  'Replaces the draft document for one route after an optimistic version check and appends an audit event.';
comment on function public.admin_publish_site_page(text, integer) is
  'Copies the checked draft document into the published row and appends an audit event.';
comment on function public.admin_discard_site_page_draft(text) is
  'Removes the draft row for one route without changing published content.';

commit;
