-- LOCAL DRAFT ONLY: do not apply until this migration has been reviewed.
-- Content viewers: moderator, content_manager, admin.
-- Content editors: content_manager, admin. Subscriber and anon have no backend access.

begin;

create function private.is_active_content_viewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.user_roles
      where user_id = (select auth.uid())
        and role in ('moderator'::public.app_role, 'content_manager'::public.app_role, 'admin'::public.app_role)
    )
    and not exists (
      select 1 from public.account_restrictions
      where user_id = (select auth.uid()) and blocked
    );
$$;

create function private.is_active_content_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.user_roles
      where user_id = (select auth.uid())
        and role in ('content_manager'::public.app_role, 'admin'::public.app_role)
    )
    and not exists (
      select 1 from public.account_restrictions
      where user_id = (select auth.uid()) and blocked
    );
$$;

revoke all on function private.is_active_content_viewer() from public, anon, authenticated, service_role;
revoke all on function private.is_active_content_editor() from public, anon, authenticated, service_role;

drop policy if exists "cms_videos_select_active_admin" on public.cms_videos;
create policy "cms_videos_select_active_content_viewer"
on public.cms_videos
for select
to authenticated
using ((select private.is_active_content_viewer()));

create function public.content_list_cms_videos()
returns table (
  id uuid, title text, short_description text, platform public.cms_video_platform,
  video_url text, category text, featured boolean, display_order integer,
  status public.cms_content_status, published_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_active_content_viewer() then
    raise exception using errcode = '42501', message = 'active_content_viewer_required';
  end if;
  return query
  select videos.id, videos.title, videos.short_description, videos.platform,
    videos.video_url, videos.category, videos.featured, videos.display_order,
    videos.status, videos.published_at, videos.created_at, videos.updated_at
  from public.cms_videos as videos
  order by videos.featured desc, videos.display_order, videos.updated_at desc, videos.id;
end;
$$;

create function public.content_create_cms_video(
  p_title text,
  p_short_description text,
  p_platform public.cms_video_platform,
  p_video_url text,
  p_category text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_title text := pg_catalog.btrim(p_title);
  normalized_description text := pg_catalog.btrim(coalesce(p_short_description, ''));
  normalized_url text := pg_catalog.btrim(p_video_url);
  normalized_category text := nullif(pg_catalog.btrim(p_category), '');
  video_id uuid;
begin
  if not private.is_active_content_editor() then
    raise exception using errcode = '42501', message = 'active_content_editor_required';
  end if;
  perform private.validate_cms_video_fields(normalized_title, normalized_description, p_platform, normalized_url, normalized_category);
  insert into public.cms_videos (title, short_description, platform, video_url, category, created_by, updated_by)
  values (normalized_title, normalized_description, p_platform, normalized_url, normalized_category, actor_id, actor_id)
  returning id into video_id;
  perform private.append_cms_video_audit(actor_id, 'cms.video_created', video_id, normalized_title, '{}'::jsonb);
  return video_id;
end;
$$;

create function public.content_update_cms_video(
  p_video_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_short_description text,
  p_platform public.cms_video_platform,
  p_video_url text,
  p_category text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_title text := pg_catalog.btrim(p_title);
  normalized_description text := pg_catalog.btrim(coalesce(p_short_description, ''));
  normalized_url text := pg_catalog.btrim(p_video_url);
  normalized_category text := nullif(pg_catalog.btrim(p_category), '');
  video_row public.cms_videos%rowtype;
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  if p_video_id is null or p_expected_updated_at is null then raise exception using errcode = '22023', message = 'invalid_video_version'; end if;
  perform private.validate_cms_video_fields(normalized_title, normalized_description, p_platform, normalized_url, normalized_category);
  select * into video_row from public.cms_videos where id = p_video_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'video_not_found'; end if;
  if video_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_video_version'; end if;
  if video_row.title = normalized_title
    and video_row.short_description = normalized_description
    and video_row.platform = p_platform
    and video_row.video_url = normalized_url
    and video_row.category is not distinct from normalized_category
  then return false; end if;
  update public.cms_videos set title = normalized_title, short_description = normalized_description,
    platform = p_platform, video_url = normalized_url, category = normalized_category, updated_by = actor_id
  where id = p_video_id;
  perform private.append_cms_video_audit(actor_id, 'cms.video_updated', p_video_id, normalized_title, '{}'::jsonb);
  return true;
end;
$$;

create function public.content_set_cms_video_publication(
  p_video_id uuid,
  p_publish boolean,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid()); video_row public.cms_videos%rowtype; next_status public.cms_content_status;
begin
  perform pg_catalog.pg_advisory_xact_lock(42420081002);
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  if p_video_id is null or p_publish is null or p_expected_updated_at is null then raise exception using errcode = '22023', message = 'invalid_publication_request'; end if;
  select * into video_row from public.cms_videos where id = p_video_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'video_not_found'; end if;
  if video_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_video_version'; end if;
  next_status := case when p_publish then 'published'::public.cms_content_status else 'draft'::public.cms_content_status end;
  if video_row.status = next_status then return false; end if;
  update public.cms_videos set status = next_status,
    published_at = case when p_publish then now() else null end,
    featured = case when p_publish then featured else false end,
    updated_by = actor_id where id = p_video_id;
  perform private.append_cms_video_audit(actor_id,
    case when p_publish then 'cms.video_published' else 'cms.video_unpublished' end,
    p_video_id, video_row.title, '{}'::jsonb);
  return true;
end;
$$;

create function public.content_set_cms_video_featured(
  p_video_id uuid,
  p_featured boolean,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid()); video_row public.cms_videos%rowtype; previous_featured public.cms_videos%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(42420081002);
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  if p_video_id is null or p_featured is null or p_expected_updated_at is null then raise exception using errcode = '22023', message = 'invalid_featured_request'; end if;
  select * into video_row from public.cms_videos where id = p_video_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'video_not_found'; end if;
  if video_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_video_version'; end if;
  if p_featured and video_row.status <> 'published'::public.cms_content_status then raise exception using errcode = '23514', message = 'published_video_required'; end if;
  if video_row.featured = p_featured then return false; end if;
  if p_featured then
    select * into previous_featured from public.cms_videos where featured and status = 'published' and id <> p_video_id for update;
    if found then
      update public.cms_videos set featured = false, updated_by = actor_id where id = previous_featured.id;
      perform private.append_cms_video_audit(actor_id, 'cms.video_unfeatured', previous_featured.id, previous_featured.title, '{}'::jsonb);
    end if;
  end if;
  update public.cms_videos set featured = p_featured, updated_by = actor_id where id = p_video_id;
  perform private.append_cms_video_audit(actor_id,
    case when p_featured then 'cms.video_featured' else 'cms.video_unfeatured' end,
    p_video_id, video_row.title, '{}'::jsonb);
  return true;
end;
$$;

create function public.content_reorder_cms_video(
  p_video_id uuid,
  p_display_order integer,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid()); video_row public.cms_videos%rowtype;
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  if p_video_id is null or p_display_order is null or p_display_order not between 0 and 1000000 or p_expected_updated_at is null
  then raise exception using errcode = '22023', message = 'invalid_reorder_request'; end if;
  select * into video_row from public.cms_videos where id = p_video_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'video_not_found'; end if;
  if video_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_video_version'; end if;
  if video_row.display_order = p_display_order then return false; end if;
  update public.cms_videos set display_order = p_display_order, updated_by = actor_id where id = p_video_id;
  perform private.append_cms_video_audit(actor_id, 'cms.video_reordered', p_video_id, video_row.title,
    pg_catalog.jsonb_build_object('display_order', p_display_order));
  return true;
end;
$$;

create function public.content_delete_cms_video(p_video_id uuid, p_expected_updated_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid()); video_row public.cms_videos%rowtype;
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  if p_video_id is null or p_expected_updated_at is null then raise exception using errcode = '22023', message = 'invalid_delete_request'; end if;
  select * into video_row from public.cms_videos where id = p_video_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'video_not_found'; end if;
  if video_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_video_version'; end if;
  delete from public.cms_videos where id = p_video_id;
  perform private.append_cms_video_audit(actor_id, 'cms.video_deleted', p_video_id, video_row.title, '{}'::jsonb);
  return true;
end;
$$;

create type public.cms_event_status as enum ('draft', 'published', 'archived');

create table public.cms_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  location text not null,
  starts_at timestamptz not null,
  status public.cms_event_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint cms_events_title_check check (title = pg_catalog.btrim(title) and pg_catalog.char_length(title) between 1 and 160 and title !~ '[[:cntrl:]]'),
  constraint cms_events_description_check check (description = pg_catalog.btrim(description) and pg_catalog.char_length(description) <= 4000 and description !~ '[[:cntrl:]]'),
  constraint cms_events_location_check check (location = pg_catalog.btrim(location) and pg_catalog.char_length(location) between 1 and 240 and location !~ '[[:cntrl:]]'),
  constraint cms_events_published_state_check check (
    (status = 'published'::public.cms_event_status and published_at is not null)
    or (status <> 'published'::public.cms_event_status and published_at is null)
  )
);

create trigger cms_events_set_updated_at before update on public.cms_events
for each row execute function private.set_updated_at();
create index cms_events_public_idx on public.cms_events (status, starts_at, id);
alter table public.cms_events enable row level security;
revoke all on table public.cms_events from public, anon, authenticated, service_role;

create policy "cms_events_select_published" on public.cms_events for select to anon, authenticated
using (status = 'published'::public.cms_event_status);
create policy "cms_events_select_active_content_viewer" on public.cms_events for select to authenticated
using ((select private.is_active_content_viewer()));

alter table public.audit_events drop constraint audit_events_action_check;
alter table public.audit_events add constraint audit_events_action_check check (action in (
  'profile.display_name_updated', 'role.assigned', 'role.removed', 'account.blocked', 'account.restored',
  'account.email_change_requested', 'cms.video_created', 'cms.video_updated', 'cms.video_published',
  'cms.video_unpublished', 'cms.video_deleted', 'cms.video_featured', 'cms.video_unfeatured', 'cms.video_reordered',
  'subscription.checkout_started', 'subscription.portal_opened', 'subscription.state_synced',
  'subscriber.post_created', 'subscriber.post_updated', 'subscriber.post_published', 'subscriber.post_unpublished', 'subscriber.post_deleted',
  'moderation.case_created', 'moderation.case_updated', 'moderation.case_assigned', 'moderation.case_unassigned',
  'moderation.case_status_changed', 'moderation.case_deleted',
  'cms.event_created', 'cms.event_updated', 'cms.event_published', 'cms.event_unpublished', 'cms.event_archived', 'cms.event_restored', 'cms.event_deleted'
));
alter table public.audit_events drop constraint audit_events_target_type_check;
alter table public.audit_events add constraint audit_events_target_type_check check (
  target_type in ('account', 'profile', 'cms_video', 'subscriber_post', 'moderation_case', 'cms_event')
);
alter table public.audit_events drop constraint audit_events_target_reference_check;
alter table public.audit_events add constraint audit_events_target_reference_check check (
  (target_type in ('cms_video', 'subscriber_post', 'moderation_case', 'cms_event') and target_resource_id is not null and target_user_id is null)
  or (target_type in ('account', 'profile') and target_resource_id is null)
);

create function private.append_cms_event_audit(p_actor_id uuid, p_action text, p_event_id uuid, p_title text)
returns void language plpgsql set search_path = '' as $$
declare actor_roles public.app_role[];
begin
  select coalesce(array_agg(role order by role::text), '{}'::public.app_role[]) into actor_roles
  from public.user_roles where user_id = p_actor_id;
  insert into public.audit_events (actor_user_id, actor_role_snapshot, action, target_type, target_resource_id, target_label_snapshot, result)
  values (p_actor_id, actor_roles, p_action, 'cms_event', p_event_id, pg_catalog.left(p_title, 100), 'succeeded');
end;
$$;
revoke all on function private.append_cms_event_audit(uuid, text, uuid, text) from public, anon, authenticated, service_role;

create function public.list_published_cms_events()
returns table (id uuid, title text, description text, location text, starts_at timestamptz, published_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select events.id, events.title, events.description, events.location, events.starts_at, events.published_at, events.updated_at
  from public.cms_events as events where events.status = 'published' order by events.starts_at, events.id;
$$;

create function public.content_list_cms_events()
returns table (id uuid, title text, description text, location text, starts_at timestamptz, status public.cms_event_status, published_at timestamptz, created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_active_content_viewer() then raise exception using errcode = '42501', message = 'active_content_viewer_required'; end if;
  return query select events.id, events.title, events.description, events.location, events.starts_at,
    events.status, events.published_at, events.created_at, events.updated_at
  from public.cms_events as events
  order by case events.status when 'draft' then 0 when 'published' then 1 else 2 end, events.starts_at, events.id;
end;
$$;

create function private.validate_cms_event_fields(p_title text, p_description text, p_location text, p_starts_at timestamptz)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_title is null or pg_catalog.char_length(p_title) not between 1 and 160 or p_title ~ '[[:cntrl:]]'
  then raise exception using errcode = '22023', message = 'invalid_event_title'; end if;
  if p_description is null or pg_catalog.char_length(p_description) > 4000 or p_description ~ '[[:cntrl:]]'
  then raise exception using errcode = '22023', message = 'invalid_event_description'; end if;
  if p_location is null or pg_catalog.char_length(p_location) not between 1 and 240 or p_location ~ '[[:cntrl:]]'
  then raise exception using errcode = '22023', message = 'invalid_event_location'; end if;
  if p_starts_at is null then raise exception using errcode = '22023', message = 'invalid_event_start'; end if;
end;
$$;
revoke all on function private.validate_cms_event_fields(text, text, text, timestamptz) from public, anon, authenticated, service_role;

create function public.content_create_cms_event(p_title text, p_description text, p_location text, p_starts_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); event_id uuid; title_value text := pg_catalog.btrim(p_title); description_value text := pg_catalog.btrim(coalesce(p_description, '')); location_value text := pg_catalog.btrim(p_location);
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  perform private.validate_cms_event_fields(title_value, description_value, location_value, p_starts_at);
  insert into public.cms_events (title, description, location, starts_at, created_by, updated_by)
  values (title_value, description_value, location_value, p_starts_at, actor_id, actor_id) returning id into event_id;
  perform private.append_cms_event_audit(actor_id, 'cms.event_created', event_id, title_value);
  return event_id;
end;
$$;

create function public.content_update_cms_event(p_event_id uuid, p_expected_updated_at timestamptz, p_title text, p_description text, p_location text, p_starts_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); event_row public.cms_events%rowtype; title_value text := pg_catalog.btrim(p_title); description_value text := pg_catalog.btrim(coalesce(p_description, '')); location_value text := pg_catalog.btrim(p_location);
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  if p_event_id is null or p_expected_updated_at is null then raise exception using errcode = '22023', message = 'invalid_event_version'; end if;
  perform private.validate_cms_event_fields(title_value, description_value, location_value, p_starts_at);
  select * into event_row from public.cms_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'event_not_found'; end if;
  if event_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_event_version'; end if;
  if event_row.title = title_value and event_row.description = description_value and event_row.location = location_value and event_row.starts_at = p_starts_at then return false; end if;
  update public.cms_events set title = title_value, description = description_value, location = location_value, starts_at = p_starts_at, updated_by = actor_id where id = p_event_id;
  perform private.append_cms_event_audit(actor_id, 'cms.event_updated', p_event_id, title_value);
  return true;
end;
$$;

create function public.content_set_cms_event_publication(p_event_id uuid, p_expected_updated_at timestamptz, p_publish boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); event_row public.cms_events%rowtype; next_status public.cms_event_status;
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  if p_event_id is null or p_expected_updated_at is null or p_publish is null then raise exception using errcode = '22023', message = 'invalid_event_publication'; end if;
  select * into event_row from public.cms_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'event_not_found'; end if;
  if event_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_event_version'; end if;
  if event_row.status = 'archived' then raise exception using errcode = '23514', message = 'archived_event_locked'; end if;
  next_status := case when p_publish then 'published'::public.cms_event_status else 'draft'::public.cms_event_status end;
  if event_row.status = next_status then return false; end if;
  update public.cms_events set status = next_status, published_at = case when p_publish then now() else null end, updated_by = actor_id where id = p_event_id;
  perform private.append_cms_event_audit(actor_id, case when p_publish then 'cms.event_published' else 'cms.event_unpublished' end, p_event_id, event_row.title);
  return true;
end;
$$;

create function public.content_set_cms_event_archived(p_event_id uuid, p_expected_updated_at timestamptz, p_archive boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); event_row public.cms_events%rowtype; next_status public.cms_event_status;
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  if p_event_id is null or p_expected_updated_at is null or p_archive is null then raise exception using errcode = '22023', message = 'invalid_event_archive'; end if;
  select * into event_row from public.cms_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'event_not_found'; end if;
  if event_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_event_version'; end if;
  next_status := case when p_archive then 'archived'::public.cms_event_status else 'draft'::public.cms_event_status end;
  if event_row.status = next_status then return false; end if;
  update public.cms_events set status = next_status, published_at = null, updated_by = actor_id where id = p_event_id;
  perform private.append_cms_event_audit(actor_id, case when p_archive then 'cms.event_archived' else 'cms.event_restored' end, p_event_id, event_row.title);
  return true;
end;
$$;

create function public.content_delete_cms_event(p_event_id uuid, p_expected_updated_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); event_row public.cms_events%rowtype;
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  if p_event_id is null or p_expected_updated_at is null then raise exception using errcode = '22023', message = 'invalid_event_delete'; end if;
  select * into event_row from public.cms_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'event_not_found'; end if;
  if event_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_event_version'; end if;
  if event_row.status <> 'archived' then raise exception using errcode = '23514', message = 'archived_event_required'; end if;
  delete from public.cms_events where id = p_event_id;
  perform private.append_cms_event_audit(actor_id, 'cms.event_deleted', p_event_id, event_row.title);
  return true;
end;
$$;

revoke all on function public.content_list_cms_videos() from public, anon, authenticated, service_role;
revoke all on function public.content_create_cms_video(text, text, public.cms_video_platform, text, text) from public, anon, authenticated, service_role;
revoke all on function public.content_update_cms_video(uuid, timestamptz, text, text, public.cms_video_platform, text, text) from public, anon, authenticated, service_role;
revoke all on function public.content_set_cms_video_publication(uuid, boolean, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.content_set_cms_video_featured(uuid, boolean, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.content_reorder_cms_video(uuid, integer, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.content_delete_cms_video(uuid, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.list_published_cms_events() from public, anon, authenticated, service_role;
revoke all on function public.content_list_cms_events() from public, anon, authenticated, service_role;
revoke all on function public.content_create_cms_event(text, text, text, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.content_update_cms_event(uuid, timestamptz, text, text, text, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.content_set_cms_event_publication(uuid, timestamptz, boolean) from public, anon, authenticated, service_role;
revoke all on function public.content_set_cms_event_archived(uuid, timestamptz, boolean) from public, anon, authenticated, service_role;
revoke all on function public.content_delete_cms_event(uuid, timestamptz) from public, anon, authenticated, service_role;

grant execute on function public.content_list_cms_videos() to authenticated;
grant execute on function public.content_create_cms_video(text, text, public.cms_video_platform, text, text) to authenticated;
grant execute on function public.content_update_cms_video(uuid, timestamptz, text, text, public.cms_video_platform, text, text) to authenticated;
grant execute on function public.content_set_cms_video_publication(uuid, boolean, timestamptz) to authenticated;
grant execute on function public.content_set_cms_video_featured(uuid, boolean, timestamptz) to authenticated;
grant execute on function public.content_reorder_cms_video(uuid, integer, timestamptz) to authenticated;
grant execute on function public.content_delete_cms_video(uuid, timestamptz) to authenticated;
grant execute on function public.list_published_cms_events() to anon, authenticated;
grant execute on function public.content_list_cms_events() to authenticated;
grant execute on function public.content_create_cms_event(text, text, text, timestamptz) to authenticated;
grant execute on function public.content_update_cms_event(uuid, timestamptz, text, text, text, timestamptz) to authenticated;
grant execute on function public.content_set_cms_event_publication(uuid, timestamptz, boolean) to authenticated;
grant execute on function public.content_set_cms_event_archived(uuid, timestamptz, boolean) to authenticated;
grant execute on function public.content_delete_cms_event(uuid, timestamptz) to authenticated;

commit;
