-- LOCAL ONLY: apply only after migrations 007-009 are reviewed and approved.
-- Adds small private MP4/WebM objects to the existing subscriber-media boundary.

begin;

create or replace function private.is_valid_subscriber_media_path(
  p_path text,
  p_post_id text,
  p_kind text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select p_kind in ('cover', 'content', 'video')
    and p_post_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and p_path = pg_catalog.btrim(p_path)
    and pg_catalog.char_length(p_path) between 85 and 160
    and p_path !~ '[[:space:][:cntrl:]]'
    and p_path !~ '(^|/)\.\.(/|$)'
    and (
      (
        p_kind in ('cover', 'content')
        and p_path ~ (
          '^posts/' || p_post_id || '/' || p_kind ||
          '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif|avif)$'
        )
      )
      or (
        p_kind = 'video'
        and p_path ~ (
          '^posts/' || p_post_id || '/video/' ||
          '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp4|webm)$'
        )
      )
    );
$$;

alter table public.subscriber_posts
  add column video_path text,
  add constraint subscriber_posts_video_path_check check (
    video_path is null
    or private.is_valid_subscriber_media_path(video_path, id::text, 'video')
  );

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'video/mp4', 'video/webm'
    ]
where id = 'subscriber-media';

create or replace function public.admin_set_subscriber_post_image_path(
  p_post_id uuid,
  p_kind text,
  p_path text,
  p_expected_updated_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  post_row public.subscriber_posts%rowtype;
  previous_path text;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;
  if p_kind not in ('cover', 'content', 'video') then
    raise exception using errcode = '22023', message = 'invalid_subscriber_media_kind';
  end if;
  if p_path is not null
    and not private.is_valid_subscriber_media_path(p_path, p_post_id::text, p_kind)
  then
    raise exception using errcode = '22023', message = 'invalid_subscriber_media_path';
  end if;

  select * into post_row
  from public.subscriber_posts
  where id = p_post_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'subscriber_post_not_found';
  end if;
  if post_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_subscriber_post_version';
  end if;

  previous_path := case p_kind
    when 'cover' then post_row.cover_image_path
    when 'content' then post_row.content_image_path
    else post_row.video_path
  end;

  update public.subscriber_posts
  set cover_image_path = case when p_kind = 'cover' then p_path else cover_image_path end,
      content_image_path = case when p_kind = 'content' then p_path else content_image_path end,
      video_path = case when p_kind = 'video' then p_path else video_path end
  where id = p_post_id;

  perform private.append_subscriber_post_audit(
    actor_id,
    'subscriber.post_updated',
    p_post_id,
    post_row.title
  );
  return previous_path;
end;
$$;

revoke all on function public.admin_set_subscriber_post_image_path(uuid, text, text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_set_subscriber_post_image_path(uuid, text, text, timestamptz)
  to authenticated;

drop function public.get_published_subscriber_post(text);
drop function public.list_published_subscriber_posts();

create function public.list_published_subscriber_posts()
returns table (
  id uuid,
  title text,
  slug text,
  excerpt text,
  cover_image_url text,
  has_cover_image boolean,
  status public.cms_content_status,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_active_paid_subscription((select auth.uid())) then
    raise exception using errcode = '42501', message = 'active_subscription_required';
  end if;
  return query
  select posts.id, posts.title, posts.slug, posts.excerpt,
    posts.cover_image_url, posts.cover_image_path is not null,
    posts.status, posts.published_at
  from public.subscriber_posts as posts
  where posts.status = 'published'::public.cms_content_status
  order by posts.published_at desc, posts.id;
end;
$$;

create function public.get_published_subscriber_post(p_slug text)
returns table (
  id uuid,
  title text,
  slug text,
  excerpt text,
  body text,
  cover_image_url text,
  has_cover_image boolean,
  has_content_image boolean,
  has_private_video boolean,
  media_url text,
  media_type public.subscriber_media_type,
  status public.cms_content_status,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_active_paid_subscription((select auth.uid())) then
    raise exception using errcode = '42501', message = 'active_subscription_required';
  end if;
  return query
  select posts.id, posts.title, posts.slug, posts.excerpt, posts.body,
    posts.cover_image_url, posts.cover_image_path is not null,
    posts.content_image_path is not null, posts.video_path is not null,
    posts.media_url, posts.media_type, posts.status, posts.published_at
  from public.subscriber_posts as posts
  where posts.slug = p_slug
    and posts.status = 'published'::public.cms_content_status
  limit 1;
end;
$$;

create function public.resolve_subscriber_media_path(
  p_post_id uuid,
  p_slug text,
  p_kind text,
  p_allow_draft boolean default false
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resolved_path text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using errcode = '42501', message = 'server_media_lookup_required';
  end if;
  if p_kind not in ('cover', 'content', 'video') then
    raise exception using errcode = '22023', message = 'invalid_subscriber_media_kind';
  end if;

  select case p_kind
    when 'cover' then posts.cover_image_path
    when 'content' then posts.content_image_path
    else posts.video_path
  end
  into resolved_path
  from public.subscriber_posts as posts
  where posts.id = p_post_id
    and posts.slug = p_slug
    and (p_allow_draft or posts.status = 'published'::public.cms_content_status);

  if resolved_path is not null
    and not private.is_valid_subscriber_media_path(resolved_path, p_post_id::text, p_kind)
  then
    raise exception using errcode = '22023', message = 'invalid_subscriber_media_path';
  end if;
  return resolved_path;
end;
$$;

revoke all on function public.list_published_subscriber_posts()
  from public, anon, authenticated, service_role;
revoke all on function public.get_published_subscriber_post(text)
  from public, anon, authenticated, service_role;
revoke all on function public.resolve_subscriber_media_path(uuid, text, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.list_published_subscriber_posts()
  to authenticated;
grant execute on function public.get_published_subscriber_post(text)
  to authenticated;
grant execute on function public.resolve_subscriber_media_path(uuid, text, text, boolean)
  to service_role;

comment on function public.resolve_subscriber_media_path(uuid, text, text, boolean) is
  'Server-only object-path lookup. The caller must authorize subscriber or admin access before invoking it.';

commit;
