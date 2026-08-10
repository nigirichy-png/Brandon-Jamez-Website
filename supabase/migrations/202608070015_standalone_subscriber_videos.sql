begin;

alter table private.subscriber_bunny_videos add column id uuid default gen_random_uuid();
alter table private.subscriber_bunny_videos add column title text;
alter table private.subscriber_bunny_videos add column slug text;
alter table private.subscriber_bunny_videos add column description text;
alter table private.subscriber_bunny_videos add column publication_status public.cms_content_status not null default 'draft';
alter table private.subscriber_bunny_videos add column published_at timestamptz;

update private.subscriber_bunny_videos as video
set title = pg_catalog.regexp_replace(video.file_name, '\.[^.]+$', ''),
    slug = 'subscriber-video-' || pg_catalog.left(video.provider_video_id::text, 8),
    publication_status = coalesce(posts.status, 'draft'::public.cms_content_status),
    published_at = case when posts.status = 'published'::public.cms_content_status then coalesce(posts.published_at, now()) end
from public.subscriber_posts as posts
where posts.id = video.post_id;

update private.subscriber_bunny_videos
set title = coalesce(title, pg_catalog.regexp_replace(file_name, '\.[^.]+$', '')),
    slug = coalesce(slug, 'subscriber-video-' || pg_catalog.left(provider_video_id::text, 8));

alter table private.subscriber_bunny_videos drop constraint subscriber_bunny_videos_pkey;
alter table private.subscriber_bunny_videos alter column id set not null;
alter table private.subscriber_bunny_videos add primary key (id);
alter table private.subscriber_bunny_videos alter column post_id drop not null;
alter table private.subscriber_bunny_videos add constraint subscriber_bunny_post_unique unique (post_id);
alter table private.subscriber_bunny_videos alter column title set not null;
alter table private.subscriber_bunny_videos alter column slug set not null;
alter table private.subscriber_bunny_videos add constraint subscriber_bunny_slug_unique unique (slug);
alter table private.subscriber_bunny_videos add constraint subscriber_bunny_title_check check (
  pg_catalog.char_length(title) between 1 and 160 and title !~ '[[:cntrl:]]'
);
alter table private.subscriber_bunny_videos add constraint subscriber_bunny_slug_check check (
  pg_catalog.char_length(slug) between 1 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
);
alter table private.subscriber_bunny_videos add constraint subscriber_bunny_description_check check (
  description is null or (pg_catalog.char_length(description) between 1 and 500 and description !~ '[[:cntrl:]]')
);
alter table private.subscriber_bunny_videos add constraint subscriber_bunny_publication_check check (
  (publication_status = 'published'::public.cms_content_status and published_at is not null)
  or (publication_status = 'draft'::public.cms_content_status and published_at is null)
);

-- Existing Bunny videos become standalone entries; no provider asset is copied or re-uploaded.
update private.subscriber_bunny_videos set post_id = null;

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
  'youtube.chat_message_deleted', 'youtube.chat_user_timed_out', 'youtube.chat_user_hidden', 'youtube.chat_message_sent'
));

create function private.append_subscriber_video_audit(p_action text, p_video_id uuid, p_title text)
returns void language plpgsql set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); actor_roles public.app_role[];
begin
  select coalesce(array_agg(role order by role::text), '{}'::public.app_role[]) into actor_roles
  from public.user_roles where user_id = actor_id;
  insert into public.audit_events (actor_user_id, actor_role_snapshot, action, target_type, target_resource_id, target_label_snapshot, result, metadata)
  values (actor_id, actor_roles, p_action, 'subscriber_video', p_video_id, pg_catalog.left(p_title, 100), 'succeeded', '{}'::jsonb);
end;
$$;
revoke all on function private.append_subscriber_video_audit(text, uuid, text) from public, anon, authenticated, service_role;

drop function public.admin_attach_subscriber_bunny_video(uuid, timestamptz, uuid, text, bigint, text);
drop function public.admin_detach_subscriber_bunny_video(uuid, timestamptz);
drop function public.resolve_subscriber_bunny_video(uuid, text, boolean);

create function public.list_published_subscriber_bunny_videos()
returns table (id uuid, title text, slug text, description text, published_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_active_paid_subscription((select auth.uid())) then
    raise exception using errcode = '42501', message = 'active_subscription_required';
  end if;
  return query select video.id, video.title, video.slug, video.description, video.published_at
  from private.subscriber_bunny_videos as video
  where video.publication_status = 'published'::public.cms_content_status and video.status = 'ready'::public.bunny_video_status
  order by video.published_at desc, video.id;
end;
$$;

create function public.admin_list_subscriber_bunny_videos()
returns table (id uuid, title text, slug text, description text, publication_status public.cms_content_status,
  published_at timestamptz, provider_video_id uuid, status public.bunny_video_status, provider_status smallint,
  file_name text, file_size bigint, mime_type text, created_at timestamptz, updated_at timestamptz, ready_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_active_admin() then raise exception using errcode = '42501', message = 'active_admin_required'; end if;
  return query select video.id, video.title, video.slug, video.description, video.publication_status,
    video.published_at, video.provider_video_id, video.status, video.provider_status, video.file_name,
    video.file_size, video.mime_type, video.created_at, video.updated_at, video.ready_at
  from private.subscriber_bunny_videos as video order by video.updated_at desc, video.id;
end;
$$;

create function public.admin_create_subscriber_bunny_video(p_provider_video_id uuid, p_title text, p_description text,
  p_file_name text, p_file_size bigint, p_mime_type text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare video_id uuid; normalized_description text := nullif(pg_catalog.btrim(p_description), '');
begin
  if not private.is_active_admin() then raise exception using errcode = '42501', message = 'active_admin_required'; end if;
  insert into private.subscriber_bunny_videos (provider_video_id, title, slug, description, file_name, file_size, mime_type, created_by)
  values (p_provider_video_id, pg_catalog.btrim(p_title), 'subscriber-video-' || pg_catalog.left(p_provider_video_id::text, 8),
    normalized_description, pg_catalog.btrim(p_file_name), p_file_size, p_mime_type, (select auth.uid())) returning id into video_id;
  perform private.append_subscriber_video_audit('subscriber.bunny_video_upload_started', video_id, p_title);
  return video_id;
end;
$$;

create function public.admin_update_subscriber_bunny_video(p_video_id uuid, p_expected_updated_at timestamptz,
  p_title text, p_description text, p_publish boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare video_row private.subscriber_bunny_videos%rowtype; next_status public.cms_content_status;
begin
  if not private.is_active_admin() then raise exception using errcode = '42501', message = 'active_admin_required'; end if;
  select * into video_row from private.subscriber_bunny_videos where id = p_video_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'subscriber_bunny_video_not_found'; end if;
  if p_expected_updated_at is null or video_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_subscriber_video_version'; end if;
  if p_publish and video_row.status <> 'ready'::public.bunny_video_status then raise exception using errcode = '55000', message = 'subscriber_bunny_video_not_ready'; end if;
  next_status := case when p_publish then 'published'::public.cms_content_status else 'draft'::public.cms_content_status end;
  update private.subscriber_bunny_videos set title = pg_catalog.btrim(p_title), description = nullif(pg_catalog.btrim(p_description), ''),
    publication_status = next_status, published_at = case when p_publish then coalesce(published_at, now()) end, updated_at = now()
  where id = p_video_id;
  perform private.append_subscriber_video_audit('subscriber.bunny_video_updated', p_video_id, p_title);
  if video_row.publication_status <> next_status then
    perform private.append_subscriber_video_audit(case when p_publish then 'subscriber.bunny_video_published' else 'subscriber.bunny_video_unpublished' end, p_video_id, p_title);
  end if;
  return true;
end;
$$;

create function public.admin_delete_subscriber_bunny_video(p_video_id uuid, p_expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare video_row private.subscriber_bunny_videos%rowtype;
begin
  if not private.is_active_admin() then raise exception using errcode = '42501', message = 'active_admin_required'; end if;
  select * into video_row from private.subscriber_bunny_videos where id = p_video_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'subscriber_bunny_video_not_found'; end if;
  if p_expected_updated_at is null or video_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_subscriber_video_version'; end if;
  delete from private.subscriber_bunny_videos where id = p_video_id;
  perform private.append_subscriber_video_audit('subscriber.bunny_video_removed', p_video_id, video_row.title);
  return video_row.provider_video_id;
end;
$$;

create function public.resolve_subscriber_bunny_video(p_video_id uuid, p_slug text, p_allow_draft boolean default false)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare provider_id uuid;
begin
  if (select auth.role()) <> 'service_role' then raise exception using errcode = '42501', message = 'service_role_required'; end if;
  select video.provider_video_id into provider_id from private.subscriber_bunny_videos as video
  where video.id = p_video_id and video.slug = p_slug and video.status = 'ready'::public.bunny_video_status
    and (p_allow_draft or video.publication_status = 'published'::public.cms_content_status);
  return provider_id;
end;
$$;

revoke all on function public.list_published_subscriber_bunny_videos() from public, anon, authenticated, service_role;
revoke all on function public.admin_list_subscriber_bunny_videos() from public, anon, authenticated, service_role;
revoke all on function public.admin_create_subscriber_bunny_video(uuid, text, text, text, bigint, text) from public, anon, authenticated, service_role;
revoke all on function public.admin_update_subscriber_bunny_video(uuid, timestamptz, text, text, boolean) from public, anon, authenticated, service_role;
revoke all on function public.admin_delete_subscriber_bunny_video(uuid, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.resolve_subscriber_bunny_video(uuid, text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.list_published_subscriber_bunny_videos() to authenticated;
grant execute on function public.admin_list_subscriber_bunny_videos() to authenticated;
grant execute on function public.admin_create_subscriber_bunny_video(uuid, text, text, text, bigint, text) to authenticated;
grant execute on function public.admin_update_subscriber_bunny_video(uuid, timestamptz, text, text, boolean) to authenticated;
grant execute on function public.admin_delete_subscriber_bunny_video(uuid, timestamptz) to authenticated;
grant execute on function public.resolve_subscriber_bunny_video(uuid, text, boolean) to service_role;

comment on function public.list_published_subscriber_bunny_videos() is 'Entitled subscriber DTO for standalone ready videos; contains no provider identifiers or signed URLs.';
comment on function public.resolve_subscriber_bunny_video(uuid, text, boolean) is 'Server-only provider lookup after subscriber or active-admin authorization.';

commit;
