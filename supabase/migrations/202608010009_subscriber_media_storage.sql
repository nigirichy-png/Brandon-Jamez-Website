-- LOCAL ONLY: do not apply until reviewed and explicitly approved.
-- Private image storage for subscriber posts. No public object reads are granted.

begin;

create function private.is_valid_subscriber_media_path(
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
  select p_kind in ('cover', 'content')
    and p_post_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and p_path = pg_catalog.btrim(p_path)
    and pg_catalog.char_length(p_path) between 85 and 160
    and p_path !~ '[[:space:][:cntrl:]]'
    and p_path !~ '(^|/)\.\.(/|$)'
    and p_path ~ (
      '^posts/' || p_post_id::text || '/' || p_kind ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif|avif)$'
    );
$$;

revoke all on function private.is_valid_subscriber_media_path(text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function private.is_valid_subscriber_media_path(text, text, text)
  to authenticated;

alter table public.subscriber_posts
  add column cover_image_path text,
  add column content_image_path text,
  add constraint subscriber_posts_cover_image_path_check check (
    cover_image_path is null
    or private.is_valid_subscriber_media_path(cover_image_path, id::text, 'cover')
  ),
  add constraint subscriber_posts_content_image_path_check check (
    content_image_path is null
    or private.is_valid_subscriber_media_path(content_image_path, id::text, 'content')
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'subscriber-media',
  'subscriber-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "subscriber_media_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'subscriber-media'
  and (select private.is_active_admin())
  and private.is_valid_subscriber_media_path(
    name,
    (storage.foldername(name))[2],
    (storage.foldername(name))[3]
  )
);

create policy "subscriber_media_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'subscriber-media'
  and (select private.is_active_admin())
  and private.is_valid_subscriber_media_path(
    name,
    (storage.foldername(name))[2],
    (storage.foldername(name))[3]
  )
)
with check (
  bucket_id = 'subscriber-media'
  and (select private.is_active_admin())
  and private.is_valid_subscriber_media_path(
    name,
    (storage.foldername(name))[2],
    (storage.foldername(name))[3]
  )
);

create policy "subscriber_media_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'subscriber-media'
  and (select private.is_active_admin())
  and private.is_valid_subscriber_media_path(
    name,
    (storage.foldername(name))[2],
    (storage.foldername(name))[3]
  )
);

create function public.admin_set_subscriber_post_image_path(
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
  if p_kind not in ('cover', 'content') then
    raise exception using errcode = '22023', message = 'invalid_subscriber_image_kind';
  end if;
  if p_path is not null
    and not private.is_valid_subscriber_media_path(p_path, p_post_id::text, p_kind)
  then
    raise exception using errcode = '22023', message = 'invalid_subscriber_image_path';
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

  previous_path := case when p_kind = 'cover'
    then post_row.cover_image_path else post_row.content_image_path end;

  update public.subscriber_posts
  set cover_image_path = case when p_kind = 'cover' then p_path else cover_image_path end,
      content_image_path = case when p_kind = 'content' then p_path else content_image_path end
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

drop function public.list_published_subscriber_posts();
create function public.list_published_subscriber_posts()
returns table (
  id uuid,
  title text,
  slug text,
  excerpt text,
  cover_image_url text,
  cover_image_path text,
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
    posts.cover_image_url, posts.cover_image_path, posts.status, posts.published_at
  from public.subscriber_posts as posts
  where posts.status = 'published'::public.cms_content_status
  order by posts.published_at desc, posts.id;
end;
$$;

drop function public.get_published_subscriber_post(text);
create function public.get_published_subscriber_post(p_slug text)
returns table (
  id uuid,
  title text,
  slug text,
  excerpt text,
  body text,
  cover_image_url text,
  cover_image_path text,
  content_image_path text,
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
    posts.cover_image_url, posts.cover_image_path, posts.content_image_path,
    posts.media_url, posts.media_type, posts.status, posts.published_at
  from public.subscriber_posts as posts
  where posts.slug = p_slug
    and posts.status = 'published'::public.cms_content_status
  limit 1;
end;
$$;

revoke all on function public.list_published_subscriber_posts()
  from public, anon, authenticated, service_role;
revoke all on function public.get_published_subscriber_post(text)
  from public, anon, authenticated, service_role;
grant execute on function public.list_published_subscriber_posts() to authenticated;
grant execute on function public.get_published_subscriber_post(text) to authenticated;

commit;
