begin;

create table private.public_bunny_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text,
  category text,
  provider_video_id uuid not null unique,
  status public.bunny_video_status not null default 'pending',
  provider_status smallint,
  publication_status public.cms_content_status not null default 'draft',
  published_at timestamptz,
  featured boolean not null default false,
  display_order integer not null default 0,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  constraint public_bunny_title_check check (title = pg_catalog.btrim(title) and pg_catalog.char_length(title) between 1 and 120 and title !~ '[[:cntrl:]]'),
  constraint public_bunny_description_check check (short_description is null or (short_description = pg_catalog.btrim(short_description) and pg_catalog.char_length(short_description) between 1 and 500 and short_description !~ '[[:cntrl:]]')),
  constraint public_bunny_category_check check (category is null or (category = pg_catalog.btrim(category) and pg_catalog.char_length(category) between 1 and 60 and category !~ '[[:cntrl:]]')),
  constraint public_bunny_provider_status_check check (provider_status is null or provider_status between 0 and 8),
  constraint public_bunny_display_order_check check (display_order between 0 and 1000000),
  constraint public_bunny_file_name_check check (file_name = pg_catalog.btrim(file_name) and pg_catalog.char_length(file_name) between 1 and 255 and file_name !~ '[[:cntrl:]]'),
  constraint public_bunny_file_size_check check (file_size between 1 and 32212254720),
  constraint public_bunny_mime_type_check check (mime_type in ('video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo', 'video/mpeg', 'video/mp2t')),
  constraint public_bunny_publication_check check (
    (publication_status = 'published'::public.cms_content_status and published_at is not null)
    or (publication_status = 'draft'::public.cms_content_status and published_at is null and not featured)
  )
);

alter table private.public_bunny_videos enable row level security;
create trigger public_bunny_videos_set_updated_at before update on private.public_bunny_videos
for each row execute function private.set_updated_at();

create function public.list_published_public_bunny_videos()
returns table (
  id uuid, title text, short_description text, video_url text, category text,
  featured boolean, display_order integer, published_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select video.id, video.title, coalesce(video.short_description, ''),
    '/videos/watch/' || video.id::text, video.category, video.featured,
    video.display_order, video.published_at, video.created_at, video.updated_at
  from private.public_bunny_videos as video
  where video.publication_status = 'published'::public.cms_content_status
    and video.status = 'ready'::public.bunny_video_status
  order by video.featured desc, video.display_order, video.published_at desc, video.id;
$$;

create function public.content_list_public_bunny_videos()
returns table (
  id uuid, title text, short_description text, category text, featured boolean,
  display_order integer, publication_status public.cms_content_status,
  published_at timestamptz, provider_video_id uuid, status public.bunny_video_status,
  provider_status smallint, file_name text, file_size bigint, mime_type text,
  created_at timestamptz, updated_at timestamptz, ready_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_active_content_viewer() then raise exception using errcode = '42501', message = 'active_content_viewer_required'; end if;
  return query select video.id, video.title, video.short_description, video.category,
    video.featured, video.display_order, video.publication_status, video.published_at,
    video.provider_video_id, video.status, video.provider_status, video.file_name,
    video.file_size, video.mime_type, video.created_at, video.updated_at, video.ready_at
  from private.public_bunny_videos as video order by video.updated_at desc, video.id;
end;
$$;

create function public.content_create_public_bunny_video(
  p_provider_video_id uuid, p_title text, p_short_description text, p_category text,
  p_file_name text, p_file_size bigint, p_mime_type text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare video_id uuid; actor_id uuid := (select auth.uid());
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  insert into private.public_bunny_videos (
    provider_video_id, title, short_description, category, file_name, file_size, mime_type, created_by
  ) values (
    p_provider_video_id, pg_catalog.btrim(p_title), nullif(pg_catalog.btrim(p_short_description), ''),
    nullif(pg_catalog.btrim(p_category), ''), pg_catalog.btrim(p_file_name), p_file_size, p_mime_type, actor_id
  ) returning id into video_id;
  perform private.append_cms_video_audit(actor_id, 'cms.video_created', video_id, p_title, pg_catalog.jsonb_build_object('source', 'bunny'));
  return video_id;
end;
$$;

create function public.content_update_public_bunny_video(
  p_video_id uuid, p_expected_updated_at timestamptz, p_title text,
  p_short_description text, p_category text, p_publish boolean
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare video_row private.public_bunny_videos%rowtype; actor_id uuid := (select auth.uid()); next_status public.cms_content_status;
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  select * into video_row from private.public_bunny_videos where id = p_video_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'public_bunny_video_not_found'; end if;
  if p_expected_updated_at is null or video_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_public_bunny_video_version'; end if;
  if p_publish and video_row.status <> 'ready'::public.bunny_video_status then raise exception using errcode = '55000', message = 'public_bunny_video_not_ready'; end if;
  next_status := case when p_publish then 'published'::public.cms_content_status else 'draft'::public.cms_content_status end;
  update private.public_bunny_videos set
    title = pg_catalog.btrim(p_title),
    short_description = nullif(pg_catalog.btrim(p_short_description), ''),
    category = nullif(pg_catalog.btrim(p_category), ''),
    publication_status = next_status,
    published_at = case when p_publish then coalesce(published_at, now()) else null end,
    featured = case when p_publish then featured else false end
  where id = p_video_id;
  perform private.append_cms_video_audit(actor_id, 'cms.video_updated', p_video_id, p_title, pg_catalog.jsonb_build_object('source', 'bunny'));
  if video_row.publication_status <> next_status then
    perform private.append_cms_video_audit(actor_id, case when p_publish then 'cms.video_published' else 'cms.video_unpublished' end, p_video_id, p_title, pg_catalog.jsonb_build_object('source', 'bunny'));
  end if;
  return true;
end;
$$;

create function public.content_delete_public_bunny_video(p_video_id uuid, p_expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare video_row private.public_bunny_videos%rowtype; actor_id uuid := (select auth.uid());
begin
  if not private.is_active_content_editor() then raise exception using errcode = '42501', message = 'active_content_editor_required'; end if;
  select * into video_row from private.public_bunny_videos where id = p_video_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'public_bunny_video_not_found'; end if;
  if p_expected_updated_at is null or video_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_public_bunny_video_version'; end if;
  delete from private.public_bunny_videos where id = p_video_id;
  perform private.append_cms_video_audit(actor_id, 'cms.video_deleted', p_video_id, video_row.title, pg_catalog.jsonb_build_object('source', 'bunny'));
  return video_row.provider_video_id;
end;
$$;

create function public.service_update_public_bunny_video_status(
  p_provider_video_id uuid, p_status public.bunny_video_status, p_provider_status integer
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed_count integer;
begin
  if (select auth.role()) <> 'service_role' then raise exception using errcode = '42501', message = 'service_role_required'; end if;
  if p_provider_status not between 0 and 8 then raise exception using errcode = '22023', message = 'invalid_bunny_provider_status'; end if;
  update private.public_bunny_videos set status = p_status, provider_status = p_provider_status,
    ready_at = case when p_status = 'ready'::public.bunny_video_status then coalesce(ready_at, now()) else null end
  where provider_video_id = p_provider_video_id
    and not (status in ('ready'::public.bunny_video_status, 'failed'::public.bunny_video_status)
      and p_status in ('pending'::public.bunny_video_status, 'uploading'::public.bunny_video_status, 'processing'::public.bunny_video_status))
    and (status, coalesce(provider_status, -1)) is distinct from (p_status, p_provider_status);
  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

create function public.resolve_public_bunny_video(p_video_id uuid, p_allow_draft boolean default false)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare provider_id uuid;
begin
  if (select auth.role()) <> 'service_role' then raise exception using errcode = '42501', message = 'service_role_required'; end if;
  select video.provider_video_id into provider_id from private.public_bunny_videos as video
  where video.id = p_video_id and video.status = 'ready'::public.bunny_video_status
    and (p_allow_draft or video.publication_status = 'published'::public.cms_content_status);
  return provider_id;
end;
$$;

revoke all on table private.public_bunny_videos from public, anon, authenticated, service_role;
revoke all on function public.list_published_public_bunny_videos() from public, anon, authenticated, service_role;
revoke all on function public.content_list_public_bunny_videos() from public, anon, authenticated, service_role;
revoke all on function public.content_create_public_bunny_video(uuid, text, text, text, text, bigint, text) from public, anon, authenticated, service_role;
revoke all on function public.content_update_public_bunny_video(uuid, timestamptz, text, text, text, boolean) from public, anon, authenticated, service_role;
revoke all on function public.content_delete_public_bunny_video(uuid, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.service_update_public_bunny_video_status(uuid, public.bunny_video_status, integer) from public, anon, authenticated, service_role;
revoke all on function public.resolve_public_bunny_video(uuid, boolean) from public, anon, authenticated, service_role;

grant execute on function public.list_published_public_bunny_videos() to anon, authenticated;
grant execute on function public.content_list_public_bunny_videos() to authenticated;
grant execute on function public.content_create_public_bunny_video(uuid, text, text, text, text, bigint, text) to authenticated;
grant execute on function public.content_update_public_bunny_video(uuid, timestamptz, text, text, text, boolean) to authenticated;
grant execute on function public.content_delete_public_bunny_video(uuid, timestamptz) to authenticated;
grant execute on function public.service_update_public_bunny_video_status(uuid, public.bunny_video_status, integer) to service_role;
grant execute on function public.resolve_public_bunny_video(uuid, boolean) to service_role;

comment on table private.public_bunny_videos is 'Public-site Bunny VOD metadata. Provider identifiers remain private and playback URLs are signed on demand.';

commit;
