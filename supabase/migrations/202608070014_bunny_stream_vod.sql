begin;

create type public.bunny_video_status as enum ('pending', 'uploading', 'processing', 'ready', 'failed');

create table private.subscriber_bunny_videos (
  post_id uuid primary key references public.subscriber_posts (id) on delete restrict,
  provider_video_id uuid not null unique,
  status public.bunny_video_status not null default 'pending',
  provider_status smallint,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  constraint subscriber_bunny_file_name_check check (
    pg_catalog.char_length(file_name) between 1 and 255
    and file_name !~ '[[:cntrl:]]'
  ),
  constraint subscriber_bunny_file_size_check check (file_size between 1 and 32212254720),
  constraint subscriber_bunny_mime_check check (mime_type in (
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
    'video/x-msvideo', 'video/mpeg', 'video/mp2t'
  )),
  constraint subscriber_bunny_provider_status_check check (provider_status is null or provider_status between 0 and 8),
  constraint subscriber_bunny_ready_check check (
    (status = 'ready'::public.bunny_video_status and ready_at is not null)
    or (status <> 'ready'::public.bunny_video_status and ready_at is null)
  )
);

revoke all on table private.subscriber_bunny_videos from public, anon, authenticated, service_role;

alter table public.audit_events drop constraint audit_events_action_check;
alter table public.audit_events add constraint audit_events_action_check check (action in (
  'profile.display_name_updated', 'role.assigned', 'role.removed', 'account.blocked', 'account.restored',
  'account.email_change_requested', 'cms.video_created', 'cms.video_updated', 'cms.video_published',
  'cms.video_unpublished', 'cms.video_deleted', 'cms.video_featured', 'cms.video_unfeatured', 'cms.video_reordered',
  'subscription.checkout_started', 'subscription.portal_opened', 'subscription.state_synced',
  'subscriber.post_created', 'subscriber.post_updated', 'subscriber.post_published', 'subscriber.post_unpublished', 'subscriber.post_deleted',
  'subscriber.bunny_video_upload_started', 'subscriber.bunny_video_removed',
  'moderation.case_created', 'moderation.case_updated', 'moderation.case_assigned', 'moderation.case_unassigned',
  'moderation.case_status_changed', 'moderation.case_deleted',
  'cms.event_created', 'cms.event_updated', 'cms.event_published', 'cms.event_unpublished', 'cms.event_archived', 'cms.event_restored', 'cms.event_deleted',
  'live.session_configured', 'live.session_status_changed', 'live.chat_message_deleted', 'live.chat_user_timed_out', 'live.chat_user_banned', 'live.chat_user_unrestricted',
  'youtube.chat_message_deleted', 'youtube.chat_user_timed_out', 'youtube.chat_user_hidden', 'youtube.chat_message_sent'
));

drop function public.admin_list_subscriber_posts();
create function public.admin_list_subscriber_posts()
returns table (
  id uuid, title text, slug text, excerpt text, body text,
  cover_image_url text, media_url text, media_type public.subscriber_media_type,
  status public.cms_content_status, published_at timestamptz, created_by uuid,
  created_at timestamptz, updated_at timestamptz,
  cover_image_path text, content_image_path text, video_path text,
  bunny_video_id uuid, bunny_video_status public.bunny_video_status,
  bunny_video_file_name text, bunny_video_file_size bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;
  return query
  select posts.id, posts.title, posts.slug, posts.excerpt, posts.body,
    posts.cover_image_url, posts.media_url, posts.media_type, posts.status,
    posts.published_at, posts.created_by, posts.created_at, posts.updated_at,
    posts.cover_image_path, posts.content_image_path, posts.video_path,
    video.provider_video_id, video.status, video.file_name, video.file_size
  from public.subscriber_posts as posts
  left join private.subscriber_bunny_videos as video on video.post_id = posts.id
  order by posts.updated_at desc, posts.id;
end;
$$;

drop function public.get_published_subscriber_post(text);
create function public.get_published_subscriber_post(p_slug text)
returns table (
  id uuid, title text, slug text, excerpt text, body text, cover_image_url text,
  has_cover_image boolean, has_content_image boolean, has_private_video boolean,
  has_bunny_video boolean, media_url text, media_type public.subscriber_media_type,
  status public.cms_content_status, published_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_active_paid_subscription((select auth.uid())) then
    raise exception using errcode = '42501', message = 'active_subscription_required';
  end if;
  return query
  select posts.id, posts.title, posts.slug, posts.excerpt, posts.body,
    posts.cover_image_url, posts.cover_image_path is not null,
    posts.content_image_path is not null, posts.video_path is not null,
    exists (
      select 1 from private.subscriber_bunny_videos as video
      where video.post_id = posts.id and video.status = 'ready'::public.bunny_video_status
    ),
    posts.media_url, posts.media_type, posts.status, posts.published_at
  from public.subscriber_posts as posts
  where posts.slug = p_slug and posts.status = 'published'::public.cms_content_status
  limit 1;
end;
$$;

create function public.admin_attach_subscriber_bunny_video(
  p_post_id uuid,
  p_expected_updated_at timestamptz,
  p_provider_video_id uuid,
  p_file_name text,
  p_file_size bigint,
  p_mime_type text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); post_row public.subscriber_posts%rowtype;
begin
  if not private.is_active_admin() then raise exception using errcode = '42501', message = 'active_admin_required'; end if;
  select * into post_row from public.subscriber_posts where id = p_post_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'subscriber_post_not_found'; end if;
  if p_expected_updated_at is null or post_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_subscriber_post_version'; end if;
  if exists (select 1 from private.subscriber_bunny_videos where post_id = p_post_id) then raise exception using errcode = '23505', message = 'subscriber_bunny_video_exists'; end if;
  insert into private.subscriber_bunny_videos (post_id, provider_video_id, file_name, file_size, mime_type, created_by)
  values (p_post_id, p_provider_video_id, p_file_name, p_file_size, p_mime_type, actor_id);
  update public.subscriber_posts set updated_at = now() where id = p_post_id;
  perform private.append_subscriber_post_audit(actor_id, 'subscriber.bunny_video_upload_started', p_post_id, post_row.title);
  return true;
end;
$$;

create function public.admin_detach_subscriber_bunny_video(p_post_id uuid, p_expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); post_row public.subscriber_posts%rowtype; provider_id uuid;
begin
  if not private.is_active_admin() then raise exception using errcode = '42501', message = 'active_admin_required'; end if;
  select * into post_row from public.subscriber_posts where id = p_post_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'subscriber_post_not_found'; end if;
  if p_expected_updated_at is null or post_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_subscriber_post_version'; end if;
  delete from private.subscriber_bunny_videos where post_id = p_post_id returning provider_video_id into provider_id;
  if provider_id is null then raise exception using errcode = 'P0002', message = 'subscriber_bunny_video_not_found'; end if;
  update public.subscriber_posts set updated_at = now() where id = p_post_id;
  perform private.append_subscriber_post_audit(actor_id, 'subscriber.bunny_video_removed', p_post_id, post_row.title);
  return provider_id;
end;
$$;

create function public.service_update_subscriber_bunny_video_status(
  p_provider_video_id uuid,
  p_status public.bunny_video_status,
  p_provider_status integer
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed_count integer;
begin
  if (select auth.role()) <> 'service_role' then raise exception using errcode = '42501', message = 'service_role_required'; end if;
  if p_provider_status not between 0 and 8 then raise exception using errcode = '22023', message = 'invalid_bunny_provider_status'; end if;
  update private.subscriber_bunny_videos
  set status = p_status, provider_status = p_provider_status, updated_at = now(),
      ready_at = case when p_status = 'ready'::public.bunny_video_status then coalesce(ready_at, now()) else null end
  where provider_video_id = p_provider_video_id
    and not (
      status in ('ready'::public.bunny_video_status, 'failed'::public.bunny_video_status)
      and p_status in ('pending'::public.bunny_video_status, 'uploading'::public.bunny_video_status, 'processing'::public.bunny_video_status)
    )
    and (status, coalesce(provider_status, -1)) is distinct from (p_status, p_provider_status);
  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

create function public.resolve_subscriber_bunny_video(
  p_post_id uuid,
  p_slug text,
  p_allow_draft boolean default false
)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare provider_id uuid;
begin
  if (select auth.role()) <> 'service_role' then raise exception using errcode = '42501', message = 'service_role_required'; end if;
  select video.provider_video_id into provider_id
  from public.subscriber_posts as posts
  join private.subscriber_bunny_videos as video on video.post_id = posts.id
  where posts.id = p_post_id and posts.slug = p_slug
    and (p_allow_draft or posts.status = 'published'::public.cms_content_status)
    and video.status = 'ready'::public.bunny_video_status;
  return provider_id;
end;
$$;

revoke all on function public.admin_list_subscriber_posts() from public, anon, authenticated, service_role;
revoke all on function public.get_published_subscriber_post(text) from public, anon, authenticated, service_role;
revoke all on function public.admin_attach_subscriber_bunny_video(uuid, timestamptz, uuid, text, bigint, text) from public, anon, authenticated, service_role;
revoke all on function public.admin_detach_subscriber_bunny_video(uuid, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.service_update_subscriber_bunny_video_status(uuid, public.bunny_video_status, integer) from public, anon, authenticated, service_role;
revoke all on function public.resolve_subscriber_bunny_video(uuid, text, boolean) from public, anon, authenticated, service_role;

grant execute on function public.admin_list_subscriber_posts() to authenticated;
grant execute on function public.get_published_subscriber_post(text) to authenticated;
grant execute on function public.admin_attach_subscriber_bunny_video(uuid, timestamptz, uuid, text, bigint, text) to authenticated;
grant execute on function public.admin_detach_subscriber_bunny_video(uuid, timestamptz) to authenticated;
grant execute on function public.service_update_subscriber_bunny_video_status(uuid, public.bunny_video_status, integer) to service_role;
grant execute on function public.resolve_subscriber_bunny_video(uuid, text, boolean) to service_role;

comment on table private.subscriber_bunny_videos is 'Opaque Bunny Stream VOD references for large subscriber videos. Provider secrets and signed playback URLs are never stored.';
comment on function public.resolve_subscriber_bunny_video(uuid, text, boolean) is 'Server-only Bunny video lookup after the caller has authorized subscriber or active-admin access.';

commit;
