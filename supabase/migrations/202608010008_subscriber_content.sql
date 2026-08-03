-- LOCAL DRAFT ONLY: do not apply until reviewed.
-- Minimal subscriber post storage and guarded read/write RPCs. No Storage,
-- uploads, age verification, Stripe state, or entitlement logic changes.

begin;

create type public.subscriber_media_type as enum ('image', 'video', 'embed');

create function private.is_valid_subscriber_content_url(p_url text)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select p_url = pg_catalog.btrim(p_url)
    and pg_catalog.char_length(p_url) between 9 and 2048
    and pg_catalog.lower(pg_catalog.left(p_url, 8)) = 'https://'
    and p_url !~ '[[:space:][:cntrl:]]';
$$;

revoke all on function private.is_valid_subscriber_content_url(text)
  from public, anon, authenticated, service_role;

create table public.subscriber_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  body text not null,
  cover_image_url text,
  media_url text,
  media_type public.subscriber_media_type,
  status public.cms_content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriber_posts_title_check check (
    title = pg_catalog.btrim(title)
    and pg_catalog.char_length(title) between 1 and 160
    and title !~ '[[:cntrl:]]'
  ),
  constraint subscriber_posts_slug_check check (
    slug = pg_catalog.btrim(slug)
    and pg_catalog.char_length(slug) between 1 and 100
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint subscriber_posts_excerpt_check check (
    excerpt is null
    or (
      excerpt = pg_catalog.btrim(excerpt)
      and pg_catalog.char_length(excerpt) between 1 and 500
      and excerpt !~ '[[:cntrl:]]'
    )
  ),
  constraint subscriber_posts_body_check check (
    body = pg_catalog.btrim(body)
    and pg_catalog.char_length(body) between 1 and 50000
    and body !~ E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
  ),
  constraint subscriber_posts_cover_url_check check (
    cover_image_url is null
    or private.is_valid_subscriber_content_url(cover_image_url)
  ),
  constraint subscriber_posts_media_check check (
    (media_url is null and media_type is null)
    or (
      media_url is not null
      and media_type is not null
      and private.is_valid_subscriber_content_url(media_url)
    )
  ),
  constraint subscriber_posts_published_state_check check (
    (status = 'published'::public.cms_content_status and published_at is not null)
    or (status = 'draft'::public.cms_content_status and published_at is null)
  )
);

create index subscriber_posts_published_order_idx
  on public.subscriber_posts (status, published_at desc, id);

create trigger subscriber_posts_set_updated_at
before update on public.subscriber_posts
for each row execute function private.set_updated_at();

alter table public.subscriber_posts enable row level security;
revoke all on table public.subscriber_posts from anon, authenticated;

create policy "subscriber_posts_select_entitled_published"
on public.subscriber_posts
for select
to authenticated
using (
  status = 'published'::public.cms_content_status
  and (select private.has_active_paid_subscription((select auth.uid())))
);

create policy "subscriber_posts_manage_active_admin"
on public.subscriber_posts
for all
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

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
  'subscriber.post_deleted'
));

alter table public.audit_events drop constraint audit_events_target_type_check;
alter table public.audit_events add constraint audit_events_target_type_check check (
  target_type in ('account', 'profile', 'cms_video', 'subscriber_post')
);

alter table public.audit_events drop constraint audit_events_target_reference_check;
alter table public.audit_events add constraint audit_events_target_reference_check check (
  (target_type in ('cms_video', 'subscriber_post') and target_resource_id is not null and target_user_id is null)
  or (target_type in ('account', 'profile') and target_resource_id is null)
);

create function private.validate_subscriber_post_fields(
  p_title text,
  p_slug text,
  p_excerpt text,
  p_body text,
  p_cover_image_url text,
  p_media_url text,
  p_media_type public.subscriber_media_type,
  p_status public.cms_content_status
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_title is null
    or pg_catalog.char_length(p_title) not between 1 and 160
    or p_title ~ '[[:cntrl:]]'
  then raise exception using errcode = '22023', message = 'invalid_subscriber_post_title';
  end if;

  if p_slug is null
    or pg_catalog.char_length(p_slug) not between 1 and 100
    or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  then raise exception using errcode = '22023', message = 'invalid_subscriber_post_slug';
  end if;

  if p_excerpt is not null
    and (pg_catalog.char_length(p_excerpt) not between 1 and 500 or p_excerpt ~ '[[:cntrl:]]')
  then raise exception using errcode = '22023', message = 'invalid_subscriber_post_excerpt';
  end if;

  if p_body is null or pg_catalog.char_length(p_body) not between 1 and 50000
  then raise exception using errcode = '22023', message = 'invalid_subscriber_post_body';
  end if;

  if p_cover_image_url is not null and not private.is_valid_subscriber_content_url(p_cover_image_url)
  then raise exception using errcode = '22023', message = 'invalid_subscriber_post_cover_url';
  end if;

  if (p_media_url is null) <> (p_media_type is null)
    or (p_media_url is not null and not private.is_valid_subscriber_content_url(p_media_url))
  then raise exception using errcode = '22023', message = 'invalid_subscriber_post_media';
  end if;

  if p_status is null
  then raise exception using errcode = '22023', message = 'invalid_subscriber_post_status';
  end if;
end;
$$;

revoke all on function private.validate_subscriber_post_fields(
  text, text, text, text, text, text, public.subscriber_media_type, public.cms_content_status
) from public, anon, authenticated, service_role;

create function private.append_subscriber_post_audit(
  p_actor_id uuid,
  p_action text,
  p_post_id uuid,
  p_title text
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
    p_actor_id, actor_roles, p_action, 'subscriber_post', p_post_id,
    pg_catalog.left(p_title, 100), 'succeeded', '{}'::jsonb
  );
end;
$$;

revoke all on function private.append_subscriber_post_audit(uuid, text, uuid, text)
  from public, anon, authenticated, service_role;

create function public.list_published_subscriber_posts()
returns table (
  id uuid,
  title text,
  slug text,
  excerpt text,
  cover_image_url text,
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
    posts.cover_image_url, posts.status, posts.published_at
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
    posts.cover_image_url, posts.media_url, posts.media_type,
    posts.status, posts.published_at
  from public.subscriber_posts as posts
  where posts.slug = p_slug
    and posts.status = 'published'::public.cms_content_status
  limit 1;
end;
$$;

create function public.admin_list_subscriber_posts()
returns setof public.subscriber_posts
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
  select * from public.subscriber_posts
  order by updated_at desc, id;
end;
$$;

create function public.admin_create_subscriber_post(
  p_title text,
  p_slug text,
  p_excerpt text,
  p_body text,
  p_cover_image_url text,
  p_media_url text,
  p_media_type public.subscriber_media_type,
  p_status public.cms_content_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  post_id uuid;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  perform private.validate_subscriber_post_fields(
    p_title, p_slug, p_excerpt, p_body, p_cover_image_url,
    p_media_url, p_media_type, p_status
  );

  insert into public.subscriber_posts (
    title, slug, excerpt, body, cover_image_url, media_url,
    media_type, status, published_at, created_by
  ) values (
    p_title, p_slug, p_excerpt, p_body, p_cover_image_url, p_media_url,
    p_media_type, p_status,
    case when p_status = 'published'::public.cms_content_status then now() else null end,
    actor_id
  ) returning id into post_id;

  perform private.append_subscriber_post_audit(
    actor_id,
    case when p_status = 'published'::public.cms_content_status
      then 'subscriber.post_published' else 'subscriber.post_created' end,
    post_id,
    p_title
  );
  return post_id;
exception when unique_violation then
  raise exception using errcode = '23505', message = 'duplicate_subscriber_post_slug';
end;
$$;

create function public.admin_update_subscriber_post(
  p_post_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_slug text,
  p_excerpt text,
  p_body text,
  p_cover_image_url text,
  p_media_url text,
  p_media_type public.subscriber_media_type,
  p_status public.cms_content_status
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  post_row public.subscriber_posts%rowtype;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  perform private.validate_subscriber_post_fields(
    p_title, p_slug, p_excerpt, p_body, p_cover_image_url,
    p_media_url, p_media_type, p_status
  );

  select * into post_row from public.subscriber_posts where id = p_post_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'subscriber_post_not_found'; end if;
  if post_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_subscriber_post_version';
  end if;

  update public.subscriber_posts
  set title = p_title,
      slug = p_slug,
      excerpt = p_excerpt,
      body = p_body,
      cover_image_url = p_cover_image_url,
      media_url = p_media_url,
      media_type = p_media_type,
      status = p_status,
      published_at = case
        when p_status = 'draft'::public.cms_content_status then null
        when post_row.status = 'published'::public.cms_content_status then post_row.published_at
        else now()
      end
  where id = p_post_id;

  perform private.append_subscriber_post_audit(actor_id, 'subscriber.post_updated', p_post_id, p_title);
  if post_row.status <> p_status then
    perform private.append_subscriber_post_audit(
      actor_id,
      case when p_status = 'published'::public.cms_content_status
        then 'subscriber.post_published' else 'subscriber.post_unpublished' end,
      p_post_id,
      p_title
    );
  end if;
  return true;
exception when unique_violation then
  raise exception using errcode = '23505', message = 'duplicate_subscriber_post_slug';
end;
$$;

create function public.admin_set_subscriber_post_publication(
  p_post_id uuid,
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
  post_row public.subscriber_posts%rowtype;
  next_status public.cms_content_status;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  select * into post_row from public.subscriber_posts where id = p_post_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'subscriber_post_not_found'; end if;
  if post_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_subscriber_post_version';
  end if;

  next_status := case when p_publish then 'published'::public.cms_content_status else 'draft'::public.cms_content_status end;
  if post_row.status = next_status then return false; end if;

  update public.subscriber_posts
  set status = next_status,
      published_at = case when p_publish then now() else null end
  where id = p_post_id;

  perform private.append_subscriber_post_audit(
    actor_id,
    case when p_publish then 'subscriber.post_published' else 'subscriber.post_unpublished' end,
    p_post_id,
    post_row.title
  );
  return true;
end;
$$;

create function public.admin_delete_subscriber_post(
  p_post_id uuid,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  post_row public.subscriber_posts%rowtype;
begin
  if not private.is_active_admin() then
    raise exception using errcode = '42501', message = 'active_admin_required';
  end if;

  select * into post_row from public.subscriber_posts where id = p_post_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'subscriber_post_not_found'; end if;
  if post_row.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'stale_subscriber_post_version';
  end if;

  delete from public.subscriber_posts where id = p_post_id;
  perform private.append_subscriber_post_audit(actor_id, 'subscriber.post_deleted', p_post_id, post_row.title);
  return true;
end;
$$;

revoke all on function public.list_published_subscriber_posts() from public, anon, authenticated, service_role;
revoke all on function public.get_published_subscriber_post(text) from public, anon, authenticated, service_role;
revoke all on function public.admin_list_subscriber_posts() from public, anon, authenticated, service_role;
revoke all on function public.admin_create_subscriber_post(text, text, text, text, text, text, public.subscriber_media_type, public.cms_content_status) from public, anon, authenticated, service_role;
revoke all on function public.admin_update_subscriber_post(uuid, timestamptz, text, text, text, text, text, text, public.subscriber_media_type, public.cms_content_status) from public, anon, authenticated, service_role;
revoke all on function public.admin_set_subscriber_post_publication(uuid, boolean, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.admin_delete_subscriber_post(uuid, timestamptz) from public, anon, authenticated, service_role;

grant execute on function public.list_published_subscriber_posts() to authenticated;
grant execute on function public.get_published_subscriber_post(text) to authenticated;
grant execute on function public.admin_list_subscriber_posts() to authenticated;
grant execute on function public.admin_create_subscriber_post(text, text, text, text, text, text, public.subscriber_media_type, public.cms_content_status) to authenticated;
grant execute on function public.admin_update_subscriber_post(uuid, timestamptz, text, text, text, text, text, text, public.subscriber_media_type, public.cms_content_status) to authenticated;
grant execute on function public.admin_set_subscriber_post_publication(uuid, boolean, timestamptz) to authenticated;
grant execute on function public.admin_delete_subscriber_post(uuid, timestamptz) to authenticated;

comment on table public.subscriber_posts is
  'Plain-text subscriber content. Reads require an existing active paid entitlement; writes require an existing active administrator.';
comment on function public.list_published_subscriber_posts() is
  'Lists published subscriber post summaries after the existing paid-entitlement check.';
comment on function public.get_published_subscriber_post(text) is
  'Returns one published subscriber post after the existing paid-entitlement check; drafts return no row.';

commit;
