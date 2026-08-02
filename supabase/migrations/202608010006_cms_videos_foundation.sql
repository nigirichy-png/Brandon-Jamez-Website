-- LOCAL DRAFT ONLY: do not apply until this migration has been reviewed.
-- Videos-only CMS foundation. No public pages, storage buckets, media foreign
-- keys, roles, entitlements, or existing account state are changed here.

begin;

create type public.cms_video_platform as enum (
  'youtube',
  'rumble',
  'kick'
);

create type public.cms_content_status as enum (
  'draft',
  'published'
);

-- PostgreSQL has no built-in URL type. This helper deliberately validates a
-- small HTTPS subset without attempting to parse paths, queries, or fragments.
-- Every supported platform is bound to its official hostname and subdomains.
create function private.is_valid_cms_video_url(
  p_platform public.cms_video_platform,
  p_url text
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  normalized_url text := pg_catalog.btrim(p_url);
  authority text;
  host text;
  port_text text;
  colon_position integer;
begin
  if normalized_url <> p_url
    or pg_catalog.char_length(normalized_url) not between 9 and 2048
    or pg_catalog.lower(pg_catalog.left(normalized_url, 8)) <> 'https://'
    or normalized_url ~ '[[:space:][:cntrl:]]'
  then
    return false;
  end if;

  authority := pg_catalog.split_part(
    pg_catalog.split_part(
      pg_catalog.split_part(pg_catalog.substr(normalized_url, 9), '/', 1),
      '?',
      1
    ),
    '#',
    1
  );

  if authority = ''
    or pg_catalog.strpos(authority, '@') > 0
    or pg_catalog.strpos(authority, pg_catalog.chr(92)) > 0
  then
    return false;
  end if;

  colon_position := pg_catalog.strpos(authority, ':');
  if colon_position > 0 then
    host := pg_catalog.lower(pg_catalog.left(authority, colon_position - 1));
    port_text := pg_catalog.substr(authority, colon_position + 1);

    if pg_catalog.strpos(port_text, ':') > 0
      or port_text !~ '^[0-9]{1,5}$'
      or port_text::integer not between 1 and 65535
    then
      return false;
    end if;
  else
    host := pg_catalog.lower(authority);
  end if;

  if host = ''
    or host !~ '^[a-z0-9.-]+$'
    or host like '.%'
    or host like '%.'
    or host like '-%'
    or host like '%-'
    or host like '%..%'
    or host like '%.-%'
    or host like '%-.%'
  then
    return false;
  end if;

  return case p_platform
    when 'youtube'::public.cms_video_platform then
      host = 'youtube.com'
      or pg_catalog.right(host, 12) = '.youtube.com'
      or host = 'youtu.be'
      or pg_catalog.right(host, 9) = '.youtu.be'
    when 'rumble'::public.cms_video_platform then
      host = 'rumble.com'
      or pg_catalog.right(host, 11) = '.rumble.com'
    when 'kick'::public.cms_video_platform then
      host = 'kick.com'
      or pg_catalog.right(host, 9) = '.kick.com'
    else false
  end;
end;
$$;

revoke all on function private.is_valid_cms_video_url(public.cms_video_platform, text)
  from public, anon, authenticated;

create table public.cms_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text not null default '',
  platform public.cms_video_platform not null,
  video_url text not null,
  category text,
  featured boolean not null default false,
  display_order integer not null default 0,
  status public.cms_content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint cms_videos_title_check check (
    title = pg_catalog.btrim(title)
    and pg_catalog.char_length(title) between 1 and 120
    and title !~ '[[:cntrl:]]'
  ),
  constraint cms_videos_short_description_check check (
    short_description = pg_catalog.btrim(short_description)
    and pg_catalog.char_length(short_description) <= 500
    and short_description !~ '[[:cntrl:]]'
  ),
  constraint cms_videos_category_check check (
    category is null
    or (
      category = pg_catalog.btrim(category)
      and pg_catalog.char_length(category) between 1 and 60
      and category !~ '[[:cntrl:]]'
    )
  ),
  constraint cms_videos_video_url_check check (
    video_url = pg_catalog.btrim(video_url)
    and pg_catalog.char_length(video_url) between 9 and 2048
    and private.is_valid_cms_video_url(platform, video_url)
  ),
  constraint cms_videos_display_order_check check (
    display_order between 0 and 1000000
  ),
  constraint cms_videos_published_state_check check (
    (status = 'published'::public.cms_content_status and published_at is not null)
    or (status = 'draft'::public.cms_content_status and published_at is null)
  ),
  constraint cms_videos_featured_state_check check (
    not featured or status = 'published'::public.cms_content_status
  )
);

create unique index cms_videos_single_featured_published_idx
  on public.cms_videos (featured)
  where featured and status = 'published'::public.cms_content_status;

create index cms_videos_public_order_idx
  on public.cms_videos (status, featured desc, display_order, published_at desc);

create trigger cms_videos_set_updated_at
before update on public.cms_videos
for each row execute function private.set_updated_at();

comment on table public.cms_videos is
  'Structured platform video metadata only. It stores no uploaded video, provider token, credential, or playback secret.';
comment on column public.cms_videos.title is
  'Required plain-text title, trimmed and limited to 120 characters.';
comment on column public.cms_videos.short_description is
  'Optional-in-practice plain-text summary, stored as an empty string when absent and limited to 500 characters.';
comment on column public.cms_videos.video_url is
  'Trimmed HTTPS destination limited to 2048 characters and checked against the selected platform hostname.';
comment on column public.cms_videos.category is
  'Optional trimmed plain-text category limited to 60 characters.';
comment on column public.cms_videos.display_order is
  'Non-negative editorial order capped at 1,000,000 to reject accidental extreme values.';
comment on column public.cms_videos.created_by is
  'Creating actor when the Auth user still exists; retained content sets this to null after user deletion.';
comment on column public.cms_videos.updated_by is
  'Most recent editing actor when the Auth user still exists; retained content sets this to null after user deletion.';

alter table public.cms_videos enable row level security;

revoke all on table public.cms_videos from anon, authenticated;

-- Defense in depth for any future grant. Current public reads use the safe RPC
-- below, so callers never receive created_by or updated_by.
create policy "cms_videos_select_published"
on public.cms_videos
for select
to anon, authenticated
using (status = 'published'::public.cms_content_status);

create policy "cms_videos_select_active_admin"
on public.cms_videos
for select
to authenticated
using ((select private.is_active_admin()));

-- Extend the existing audit vocabulary and add a non-user resource target.
-- target_resource_id intentionally has no foreign key so delete events retain
-- a stable content reference without retaining content or personal data.
alter table public.audit_events
  add column target_resource_id uuid;

create index audit_events_target_resource_idx
  on public.audit_events (target_resource_id, occurred_at desc);

alter table public.audit_events
  drop constraint audit_events_action_check;

alter table public.audit_events
  add constraint audit_events_action_check check (action in (
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
    'cms.video_reordered'
  ));

alter table public.audit_events
  drop constraint audit_events_target_type_check;

alter table public.audit_events
  add constraint audit_events_target_type_check check (
    target_type in ('account', 'profile', 'cms_video')
  );

alter table public.audit_events
  add constraint audit_events_target_reference_check check (
    (target_type = 'cms_video' and target_resource_id is not null and target_user_id is null)
    or (target_type in ('account', 'profile') and target_resource_id is null)
  );

grant select (target_resource_id)
  on table public.audit_events
  to authenticated;

create function private.validate_cms_video_fields(
  p_title text,
  p_short_description text,
  p_platform public.cms_video_platform,
  p_video_url text,
  p_category text
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_title is null
    or pg_catalog.char_length(p_title) not between 1 and 120
    or p_title ~ '[[:cntrl:]]'
  then
    raise exception using errcode = '22023', message = 'invalid_video_title';
  end if;

  if p_short_description is null
    or pg_catalog.char_length(p_short_description) > 500
    or p_short_description ~ '[[:cntrl:]]'
  then
    raise exception using errcode = '22023', message = 'invalid_video_description';
  end if;

  if p_category is not null
    and (
      pg_catalog.char_length(p_category) not between 1 and 60
      or p_category ~ '[[:cntrl:]]'
    )
  then
    raise exception using errcode = '22023', message = 'invalid_video_category';
  end if;

  if p_platform is null
    or p_video_url is null
    or not private.is_valid_cms_video_url(p_platform, p_video_url)
  then
    raise exception using errcode = '22023', message = 'invalid_video_url';
  end if;
end;
$$;

revoke all on function private.validate_cms_video_fields(
  text,
  text,
  public.cms_video_platform,
  text,
  text
) from public, anon, authenticated;

create function private.append_cms_video_audit(
  p_actor_id uuid,
  p_action text,
  p_video_id uuid,
  p_title text,
  p_metadata jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  actor_roles public.app_role[];
  safe_label text := pg_catalog.left(pg_catalog.btrim(p_title), 100);
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
    'cms_video',
    p_video_id,
    safe_label,
    'succeeded',
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function private.append_cms_video_audit(uuid, text, uuid, text, jsonb)
  from public, anon, authenticated;

-- Safe public read surface: published metadata only and no actor identifiers.
create function public.list_published_cms_videos()
returns table (
  id uuid,
  title text,
  short_description text,
  platform public.cms_video_platform,
  video_url text,
  category text,
  featured boolean,
  display_order integer,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    videos.id,
    videos.title,
    videos.short_description,
    videos.platform,
    videos.video_url,
    videos.category,
    videos.featured,
    videos.display_order,
    videos.published_at,
    videos.created_at,
    videos.updated_at
  from public.cms_videos as videos
  where videos.status = 'published'::public.cms_content_status
  order by videos.featured desc,
    videos.display_order,
    videos.published_at desc,
    videos.id;
$$;

-- Future admin UI can read draft and published rows through this checked RPC.
-- Actor UUIDs remain excluded because the UI does not require them.
create function public.admin_list_cms_videos()
returns table (
  id uuid,
  title text,
  short_description text,
  platform public.cms_video_platform,
  video_url text,
  category text,
  featured boolean,
  display_order integer,
  status public.cms_content_status,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  return query
  select
    videos.id,
    videos.title,
    videos.short_description,
    videos.platform,
    videos.video_url,
    videos.category,
    videos.featured,
    videos.display_order,
    videos.status,
    videos.published_at,
    videos.created_at,
    videos.updated_at
  from public.cms_videos as videos
  order by videos.featured desc,
    videos.display_order,
    videos.updated_at desc,
    videos.id;
end;
$$;

create function public.admin_create_cms_video(
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
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  perform private.validate_cms_video_fields(
    normalized_title,
    normalized_description,
    p_platform,
    normalized_url,
    normalized_category
  );

  insert into public.cms_videos (
    title,
    short_description,
    platform,
    video_url,
    category,
    created_by,
    updated_by
  ) values (
    normalized_title,
    normalized_description,
    p_platform,
    normalized_url,
    normalized_category,
    actor_id,
    actor_id
  )
  returning id into video_id;

  perform private.append_cms_video_audit(
    actor_id,
    'cms.video_created',
    video_id,
    normalized_title,
    '{}'::jsonb
  );

  return video_id;
end;
$$;

create function public.admin_update_cms_video(
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
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_video_id is null or p_expected_updated_at is null then
    raise exception using errcode = '22023', message = 'invalid_video_version';
  end if;

  perform private.validate_cms_video_fields(
    normalized_title,
    normalized_description,
    p_platform,
    normalized_url,
    normalized_category
  );

  select * into video_row
  from public.cms_videos
  where id = p_video_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'video_not_found';
  end if;

  if video_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_video_version';
  end if;

  if video_row.title = normalized_title
    and video_row.short_description = normalized_description
    and video_row.platform = p_platform
    and video_row.video_url = normalized_url
    and video_row.category is not distinct from normalized_category
  then
    return false;
  end if;

  update public.cms_videos
  set title = normalized_title,
      short_description = normalized_description,
      platform = p_platform,
      video_url = normalized_url,
      category = normalized_category,
      updated_by = actor_id
  where id = p_video_id;

  perform private.append_cms_video_audit(
    actor_id,
    'cms.video_updated',
    p_video_id,
    normalized_title,
    '{}'::jsonb
  );

  return true;
end;
$$;

create function public.admin_set_cms_video_publication(
  p_video_id uuid,
  p_publish boolean,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  video_row public.cms_videos%rowtype;
  next_status public.cms_content_status;
  audit_action text;
begin
  perform pg_catalog.pg_advisory_xact_lock(42420081002);

  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_video_id is null or p_publish is null or p_expected_updated_at is null then
    raise exception using errcode = '22023', message = 'invalid_publication_request';
  end if;

  select * into video_row
  from public.cms_videos
  where id = p_video_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'video_not_found';
  end if;

  if video_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_video_version';
  end if;

  next_status := case
    when p_publish then 'published'::public.cms_content_status
    else 'draft'::public.cms_content_status
  end;

  if video_row.status = next_status then
    return false;
  end if;

  update public.cms_videos
  set status = next_status,
      published_at = case when p_publish then now() else null end,
      featured = case when p_publish then featured else false end,
      updated_by = actor_id
  where id = p_video_id;

  audit_action := case
    when p_publish then 'cms.video_published'
    else 'cms.video_unpublished'
  end;

  perform private.append_cms_video_audit(
    actor_id,
    audit_action,
    p_video_id,
    video_row.title,
    '{}'::jsonb
  );

  return true;
end;
$$;

create function public.admin_delete_cms_video(
  p_video_id uuid,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  video_row public.cms_videos%rowtype;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_video_id is null or p_expected_updated_at is null then
    raise exception using errcode = '22023', message = 'invalid_delete_request';
  end if;

  select * into video_row
  from public.cms_videos
  where id = p_video_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'video_not_found';
  end if;

  if video_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_video_version';
  end if;

  delete from public.cms_videos
  where id = p_video_id;

  perform private.append_cms_video_audit(
    actor_id,
    'cms.video_deleted',
    p_video_id,
    video_row.title,
    '{}'::jsonb
  );

  return true;
end;
$$;

create function public.admin_set_cms_video_featured(
  p_video_id uuid,
  p_featured boolean,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  video_row public.cms_videos%rowtype;
  previous_featured public.cms_videos%rowtype;
  had_previous_featured boolean := false;
begin
  perform pg_catalog.pg_advisory_xact_lock(42420081002);

  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_video_id is null or p_featured is null or p_expected_updated_at is null then
    raise exception using errcode = '22023', message = 'invalid_featured_request';
  end if;

  select * into video_row
  from public.cms_videos
  where id = p_video_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'video_not_found';
  end if;

  if video_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_video_version';
  end if;

  if p_featured and video_row.status <> 'published'::public.cms_content_status then
    raise exception using errcode = '23514', message = 'published_video_required';
  end if;

  if video_row.featured = p_featured then
    return false;
  end if;

  if p_featured then
    select * into previous_featured
    from public.cms_videos
    where featured
      and status = 'published'::public.cms_content_status
      and id <> p_video_id
    for update;
    had_previous_featured := found;

    if had_previous_featured then
      update public.cms_videos
      set featured = false,
          updated_by = actor_id
      where id = previous_featured.id;

      perform private.append_cms_video_audit(
        actor_id,
        'cms.video_unfeatured',
        previous_featured.id,
        previous_featured.title,
        '{}'::jsonb
      );
    end if;
  end if;

  update public.cms_videos
  set featured = p_featured,
      updated_by = actor_id
  where id = p_video_id;

  perform private.append_cms_video_audit(
    actor_id,
    case when p_featured then 'cms.video_featured' else 'cms.video_unfeatured' end,
    p_video_id,
    video_row.title,
    '{}'::jsonb
  );

  return true;
end;
$$;

create function public.admin_reorder_cms_video(
  p_video_id uuid,
  p_display_order integer,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  video_row public.cms_videos%rowtype;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  if p_video_id is null
    or p_display_order is null
    or p_display_order not between 0 and 1000000
    or p_expected_updated_at is null
  then
    raise exception using errcode = '22023', message = 'invalid_reorder_request';
  end if;

  select * into video_row
  from public.cms_videos
  where id = p_video_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'video_not_found';
  end if;

  if video_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_video_version';
  end if;

  if video_row.display_order = p_display_order then
    return false;
  end if;

  update public.cms_videos
  set display_order = p_display_order,
      updated_by = actor_id
  where id = p_video_id;

  perform private.append_cms_video_audit(
    actor_id,
    'cms.video_reordered',
    p_video_id,
    video_row.title,
    pg_catalog.jsonb_build_object('display_order', p_display_order)
  );

  return true;
end;
$$;

revoke all on function public.list_published_cms_videos()
  from public, anon, authenticated;
revoke all on function public.admin_list_cms_videos()
  from public, anon, authenticated;
revoke all on function public.admin_create_cms_video(
  text,
  text,
  public.cms_video_platform,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.admin_update_cms_video(
  uuid,
  timestamptz,
  text,
  text,
  public.cms_video_platform,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.admin_set_cms_video_publication(uuid, boolean, timestamptz)
  from public, anon, authenticated;
revoke all on function public.admin_delete_cms_video(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.admin_set_cms_video_featured(uuid, boolean, timestamptz)
  from public, anon, authenticated;
revoke all on function public.admin_reorder_cms_video(uuid, integer, timestamptz)
  from public, anon, authenticated;

grant execute on function public.list_published_cms_videos()
  to anon, authenticated;
grant execute on function public.admin_list_cms_videos()
  to authenticated;
grant execute on function public.admin_create_cms_video(
  text,
  text,
  public.cms_video_platform,
  text,
  text
) to authenticated;
grant execute on function public.admin_update_cms_video(
  uuid,
  timestamptz,
  text,
  text,
  public.cms_video_platform,
  text,
  text
) to authenticated;
grant execute on function public.admin_set_cms_video_publication(uuid, boolean, timestamptz)
  to authenticated;
grant execute on function public.admin_delete_cms_video(uuid, timestamptz)
  to authenticated;
grant execute on function public.admin_set_cms_video_featured(uuid, boolean, timestamptz)
  to authenticated;
grant execute on function public.admin_reorder_cms_video(uuid, integer, timestamptz)
  to authenticated;

comment on function public.list_published_cms_videos() is
  'Returns published video metadata without creator/editor UUIDs. This is the only public CMS video read surface.';
comment on function public.admin_list_cms_videos() is
  'Lists draft and published video metadata only after existing active-admin validation.';
comment on function public.admin_create_cms_video(text, text, public.cms_video_platform, text, text) is
  'Creates one validated draft video and atomically appends a data-minimized audit event.';
comment on function public.admin_update_cms_video(uuid, timestamptz, text, text, public.cms_video_platform, text, text) is
  'Updates editable video metadata after active-admin and optimistic-version checks, then audits the change.';
comment on function public.admin_set_cms_video_publication(uuid, boolean, timestamptz) is
  'Publishes or unpublishes one video after active-admin and optimistic-version checks, then audits the change.';
comment on function public.admin_delete_cms_video(uuid, timestamptz) is
  'Deletes one version-matched video and preserves a data-minimized audit reference.';
comment on function public.admin_set_cms_video_featured(uuid, boolean, timestamptz) is
  'Sets or clears the single featured published video and atomically audits affected records.';
comment on function public.admin_reorder_cms_video(uuid, integer, timestamptz) is
  'Changes one video display order after an optimistic-version check and audits the new order.';

commit;
