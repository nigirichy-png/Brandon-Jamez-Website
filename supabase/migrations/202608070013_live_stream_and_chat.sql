-- LOCAL DRAFT ONLY: do not apply until this migration has been reviewed.
-- Provider-neutral live state plus a Realtime chat that never carries video bytes.

begin;

create type public.live_source as enum ('youtube', 'direct');
create type public.live_status as enum ('offline', 'scheduled', 'live', 'ended');
create type public.live_chat_message_status as enum ('visible', 'deleted');
create type private.live_chat_restriction_kind as enum ('timeout', 'ban');

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source public.live_source not null,
  status public.live_status not null default 'offline',
  youtube_video_id text,
  direct_playback_provider text,
  direct_playback_reference text,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint live_sessions_title_check check (title = pg_catalog.btrim(title) and pg_catalog.char_length(title) between 1 and 160 and title !~ '[[:cntrl:]]'),
  constraint live_sessions_source_check check (
    (source = 'youtube' and youtube_video_id ~ '^[A-Za-z0-9_-]{11}$' and direct_playback_provider is null and direct_playback_reference is null)
    or (source = 'direct' and youtube_video_id is null and direct_playback_provider ~ '^[a-z0-9][a-z0-9_-]{0,39}$' and pg_catalog.char_length(direct_playback_reference) between 1 and 240)
  ),
  constraint live_sessions_direct_reference_check check (direct_playback_reference is null or (direct_playback_reference = pg_catalog.btrim(direct_playback_reference) and direct_playback_reference !~ '[[:cntrl:]/:?&#]'))
);
create unique index live_sessions_one_current_idx on public.live_sessions (is_current) where is_current;
create index live_sessions_updated_idx on public.live_sessions (updated_at desc, id);
create trigger live_sessions_set_updated_at before update on public.live_sessions for each row execute function private.set_updated_at();

create table private.live_chat_authors (
  author_key uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.live_chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  author_key uuid not null references private.live_chat_authors (author_key) on delete cascade,
  author_display_name text not null,
  body text not null,
  status public.live_chat_message_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_chat_display_name_check check (author_display_name = pg_catalog.btrim(author_display_name) and pg_catalog.char_length(author_display_name) between 1 and 80 and author_display_name !~ '[[:cntrl:]]'),
  constraint live_chat_body_check check (body = pg_catalog.btrim(body) and pg_catalog.char_length(body) between 1 and 500 and body !~ '[[:cntrl:]]')
);
create index live_chat_messages_session_idx on public.live_chat_messages (session_id, id desc);
create index live_chat_messages_rate_idx on public.live_chat_messages (author_key, created_at desc);
create trigger live_chat_messages_set_updated_at before update on public.live_chat_messages for each row execute function private.set_updated_at();

create table private.live_chat_restrictions (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind private.live_chat_restriction_kind not null,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint live_chat_restriction_expiry_check check ((kind = 'ban' and expires_at is null) or (kind = 'timeout' and expires_at > created_at))
);
create index live_chat_restrictions_active_idx on private.live_chat_restrictions (session_id, user_id, active, expires_at desc);

alter table public.live_sessions enable row level security;
alter table public.live_chat_messages enable row level security;
revoke all on table public.live_sessions, public.live_chat_messages from public, anon, authenticated, service_role;
revoke all on table private.live_chat_authors, private.live_chat_restrictions from public, anon, authenticated, service_role;
revoke all on sequence public.live_chat_messages_id_seq, private.live_chat_restrictions_id_seq from public, anon, authenticated, service_role;

create function public.is_current_live_session(p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.live_sessions where id = p_session_id and is_current);
$$;
revoke all on function public.is_current_live_session(uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_current_live_session(uuid) to anon, authenticated;

create policy "current_live_session_public_read" on public.live_sessions for select to anon, authenticated using (is_current);
create policy "current_live_chat_public_read" on public.live_chat_messages for select to anon, authenticated using ((select public.is_current_live_session(session_id)));
grant select on table public.live_chat_messages to anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_chat_messages') then
    alter publication supabase_realtime add table public.live_chat_messages;
  end if;
end $$;

alter table public.audit_events drop constraint audit_events_action_check;
alter table public.audit_events add constraint audit_events_action_check check (action in (
  'profile.display_name_updated', 'role.assigned', 'role.removed', 'account.blocked', 'account.restored',
  'account.email_change_requested', 'cms.video_created', 'cms.video_updated', 'cms.video_published',
  'cms.video_unpublished', 'cms.video_deleted', 'cms.video_featured', 'cms.video_unfeatured', 'cms.video_reordered',
  'subscription.checkout_started', 'subscription.portal_opened', 'subscription.state_synced',
  'subscriber.post_created', 'subscriber.post_updated', 'subscriber.post_published', 'subscriber.post_unpublished', 'subscriber.post_deleted',
  'moderation.case_created', 'moderation.case_updated', 'moderation.case_assigned', 'moderation.case_unassigned',
  'moderation.case_status_changed', 'moderation.case_deleted',
  'cms.event_created', 'cms.event_updated', 'cms.event_published', 'cms.event_unpublished', 'cms.event_archived', 'cms.event_restored', 'cms.event_deleted',
  'live.session_configured', 'live.session_status_changed', 'live.chat_message_deleted', 'live.chat_user_timed_out', 'live.chat_user_banned', 'live.chat_user_unrestricted',
  'youtube.chat_message_deleted', 'youtube.chat_user_timed_out', 'youtube.chat_user_hidden', 'youtube.chat_message_sent'
));
alter table public.audit_events drop constraint audit_events_target_type_check;
alter table public.audit_events add constraint audit_events_target_type_check check (target_type in ('account', 'profile', 'cms_video', 'subscriber_post', 'moderation_case', 'cms_event', 'live_session', 'youtube_live_chat'));
alter table public.audit_events drop constraint audit_events_target_reference_check;
alter table public.audit_events add constraint audit_events_target_reference_check check (
  (target_type in ('cms_video', 'subscriber_post', 'moderation_case', 'cms_event', 'live_session') and target_resource_id is not null and target_user_id is null)
  or (target_type in ('account', 'profile') and target_resource_id is null)
  or (target_type = 'youtube_live_chat' and target_resource_id is null and target_user_id is null)
);

create function private.append_live_audit(p_action text, p_session_id uuid, p_target_user_id uuid, p_label text, p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); actor_roles public.app_role[];
begin
  select coalesce(array_agg(role order by role::text), '{}'::public.app_role[]) into actor_roles from public.user_roles where user_id = actor_id;
  insert into public.audit_events (actor_user_id, actor_role_snapshot, action, target_type, target_resource_id, target_user_id, target_label_snapshot, result, metadata)
  values (actor_id, actor_roles, p_action, case when p_target_user_id is null then 'live_session' else 'account' end, case when p_target_user_id is null then p_session_id else null end, p_target_user_id, pg_catalog.left(p_label, 100), 'succeeded', p_metadata);
end;
$$;
revoke all on function private.append_live_audit(text, uuid, uuid, text, jsonb) from public, anon, authenticated, service_role;

create function public.get_current_live_session()
returns table (id uuid, title text, source public.live_source, status public.live_status, youtube_video_id text, direct_playback_provider text, direct_playback_reference text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.title, s.source, s.status, s.youtube_video_id, s.direct_playback_provider, s.direct_playback_reference, s.updated_at from public.live_sessions s where s.is_current limit 1;
$$;

create function public.list_live_chat_messages(p_session_id uuid, p_before_id bigint default null, p_limit integer default 100)
returns table (id bigint, session_id uuid, author_key uuid, author_display_name text, body text, status public.live_chat_message_status, created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_session_id is null or p_limit not between 1 and 100 then raise exception using errcode = '22023', message = 'invalid_chat_page'; end if;
  if not exists (select 1 from public.live_sessions where id = p_session_id and is_current) then raise exception using errcode = '42501', message = 'current_live_session_required'; end if;
  return query select m.id, m.session_id, m.author_key, m.author_display_name, m.body, m.status, m.created_at, m.updated_at
    from public.live_chat_messages m where m.session_id = p_session_id and (p_before_id is null or m.id < p_before_id) order by m.id desc limit p_limit;
end;
$$;

create function public.send_live_chat_message(p_session_id uuid, p_body text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); author_id uuid; display_value text; body_value text := pg_catalog.btrim(p_body); message_id bigint;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 713));
  if exists (select 1 from public.account_restrictions where user_id = actor_id and blocked) then raise exception using errcode = '42501', message = 'account_blocked'; end if;
  if not exists (select 1 from public.live_sessions where id = p_session_id and is_current and status = 'live') then raise exception using errcode = '42501', message = 'live_chat_closed'; end if;
  if body_value is null or pg_catalog.char_length(body_value) not between 1 and 500 or body_value ~ '[[:cntrl:]]' then raise exception using errcode = '22023', message = 'invalid_chat_message'; end if;
  select display_name into display_value from public.profiles where id = actor_id;
  if display_value is null then raise exception using errcode = '42501', message = 'profile_required'; end if;
  if exists (select 1 from private.live_chat_restrictions where session_id = p_session_id and user_id = actor_id and active and (expires_at is null or expires_at > now())) then raise exception using errcode = '42501', message = 'live_chat_restricted'; end if;
  insert into private.live_chat_authors (user_id) values (actor_id) on conflict (user_id) do update set user_id = excluded.user_id returning author_key into author_id;
  if exists (select 1 from public.live_chat_messages where author_key = author_id and created_at > now() - interval '2 seconds')
     or (select count(*) from public.live_chat_messages where author_key = author_id and created_at > now() - interval '1 minute') >= 20
  then raise exception using errcode = '42901', message = 'chat_rate_limited'; end if;
  insert into public.live_chat_messages (session_id, author_key, author_display_name, body) values (p_session_id, author_id, display_value, body_value) returning id into message_id;
  return message_id;
end;
$$;

create function public.admin_configure_live_session(p_session_id uuid, p_expected_updated_at timestamptz, p_title text, p_source public.live_source, p_youtube_video_id text, p_direct_provider text, p_direct_reference text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); session_row public.live_sessions%rowtype; result_id uuid; title_value text := pg_catalog.btrim(p_title);
begin
  if not private.is_active_admin() then raise exception using errcode = '42501', message = 'active_admin_required'; end if;
  if title_value is null or pg_catalog.char_length(title_value) not between 1 and 160 or title_value ~ '[[:cntrl:]]' then raise exception using errcode = '22023', message = 'invalid_live_title'; end if;
  if p_source = 'youtube' and coalesce(p_youtube_video_id, '') !~ '^[A-Za-z0-9_-]{11}$' then raise exception using errcode = '22023', message = 'invalid_youtube_video_id'; end if;
  if p_source = 'direct' and (coalesce(p_direct_provider, '') !~ '^[a-z0-9][a-z0-9_-]{0,39}$' or coalesce(p_direct_reference, '') !~ '^[A-Za-z0-9._-]{1,240}$') then raise exception using errcode = '22023', message = 'invalid_direct_playback_reference'; end if;
  if p_session_id is null then
    update public.live_sessions set is_current = false where is_current;
    insert into public.live_sessions (title, source, youtube_video_id, direct_playback_provider, direct_playback_reference, is_current, created_by, updated_by)
    values (title_value, p_source, case when p_source = 'youtube' then p_youtube_video_id else null end, case when p_source = 'direct' then p_direct_provider else null end, case when p_source = 'direct' then p_direct_reference else null end, true, actor_id, actor_id) returning id into result_id;
  else
    select * into session_row from public.live_sessions where id = p_session_id and is_current for update;
    if not found then raise exception using errcode = 'P0002', message = 'live_session_not_found'; end if;
    if p_expected_updated_at is null or session_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_live_session_version'; end if;
    update public.live_sessions set title = title_value, source = p_source, youtube_video_id = case when p_source = 'youtube' then p_youtube_video_id else null end, direct_playback_provider = case when p_source = 'direct' then p_direct_provider else null end, direct_playback_reference = case when p_source = 'direct' then p_direct_reference else null end, updated_by = actor_id where id = p_session_id;
    result_id := p_session_id;
  end if;
  perform private.append_live_audit('live.session_configured', result_id, null, title_value);
  return result_id;
end;
$$;

create function public.admin_set_live_status(p_session_id uuid, p_expected_updated_at timestamptz, p_status public.live_status)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); session_row public.live_sessions%rowtype;
begin
  if not private.is_active_admin() then raise exception using errcode = '42501', message = 'active_admin_required'; end if;
  select * into session_row from public.live_sessions where id = p_session_id and is_current for update;
  if not found then raise exception using errcode = 'P0002', message = 'live_session_not_found'; end if;
  if p_expected_updated_at is null or session_row.updated_at <> p_expected_updated_at then raise exception using errcode = '40001', message = 'stale_live_session_version'; end if;
  if session_row.status = p_status then return false; end if;
  update public.live_sessions set status = p_status, updated_by = actor_id where id = p_session_id;
  perform private.append_live_audit('live.session_status_changed', p_session_id, null, session_row.title, jsonb_build_object('from', session_row.status, 'to', p_status));
  return true;
end;
$$;

create function public.moderator_delete_live_chat_message(p_message_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare message_row public.live_chat_messages%rowtype;
begin
  if not private.is_active_moderator() then raise exception using errcode = '42501', message = 'active_moderator_required'; end if;
  select * into message_row from public.live_chat_messages where id = p_message_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'chat_message_not_found'; end if;
  if message_row.status = 'deleted' then return false; end if;
  update public.live_chat_messages set body = '[removed]', status = 'deleted' where id = p_message_id;
  perform private.append_live_audit('live.chat_message_deleted', message_row.session_id, null, 'Live chat message', jsonb_build_object('message_id', p_message_id, 'author_key', message_row.author_key));
  return true;
end;
$$;

create function public.moderator_restrict_live_chat_user(p_session_id uuid, p_author_key uuid, p_kind text, p_duration_seconds integer default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare target_id uuid; action_name text; expiry timestamptz;
begin
  if not private.is_active_moderator() then raise exception using errcode = '42501', message = 'active_moderator_required'; end if;
  select user_id into target_id from private.live_chat_authors where author_key = p_author_key;
  if target_id is null then raise exception using errcode = 'P0002', message = 'chat_user_not_found'; end if;
  if exists (select 1 from public.user_roles where user_id = target_id and role in ('admin', 'moderator')) then raise exception using errcode = '42501', message = 'staff_account_protected'; end if;
  if p_kind = 'timeout' and p_duration_seconds in (60, 300, 600, 1800, 3600, 86400) then expiry := now() + pg_catalog.make_interval(secs => p_duration_seconds); action_name := 'live.chat_user_timed_out';
  elsif p_kind = 'ban' and p_duration_seconds is null then expiry := null; action_name := 'live.chat_user_banned';
  else raise exception using errcode = '22023', message = 'invalid_chat_restriction'; end if;
  update private.live_chat_restrictions set active = false where session_id = p_session_id and user_id = target_id and active;
  insert into private.live_chat_restrictions (session_id, user_id, kind, expires_at, created_by) values (p_session_id, target_id, p_kind::private.live_chat_restriction_kind, expiry, (select auth.uid()));
  perform private.append_live_audit(action_name, p_session_id, target_id, 'Live chat account', jsonb_build_object('author_key', p_author_key, 'duration_seconds', p_duration_seconds));
  return true;
end;
$$;

create function public.moderator_unrestrict_live_chat_user(p_session_id uuid, p_author_key uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare target_id uuid; changed_count integer;
begin
  if not private.is_active_moderator() then raise exception using errcode = '42501', message = 'active_moderator_required'; end if;
  select user_id into target_id from private.live_chat_authors where author_key = p_author_key;
  update private.live_chat_restrictions set active = false where session_id = p_session_id and user_id = target_id and active;
  get diagnostics changed_count = row_count;
  if changed_count > 0 then perform private.append_live_audit('live.chat_user_unrestricted', p_session_id, target_id, 'Live chat account', jsonb_build_object('author_key', p_author_key)); end if;
  return changed_count > 0;
end;
$$;

create function public.record_youtube_moderation_action(p_action text, p_live_chat_id text, p_target_label text, p_metadata jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); actor_roles public.app_role[];
begin
  if not private.is_active_moderator() then raise exception using errcode = '42501', message = 'active_moderator_required'; end if;
  if p_action = 'youtube.chat_message_sent' and not private.is_active_admin() then raise exception using errcode = '42501', message = 'active_admin_required'; end if;
  if p_action not in ('youtube.chat_message_deleted', 'youtube.chat_user_timed_out', 'youtube.chat_user_hidden', 'youtube.chat_message_sent')
    or p_live_chat_id is null or pg_catalog.char_length(p_live_chat_id) not between 1 and 256
  then raise exception using errcode = '22023', message = 'invalid_youtube_audit'; end if;
  select coalesce(array_agg(role order by role::text), '{}'::public.app_role[]) into actor_roles from public.user_roles where user_id = actor_id;
  insert into public.audit_events (actor_user_id, actor_role_snapshot, action, target_type, target_label_snapshot, result, metadata)
  values (actor_id, actor_roles, p_action, 'youtube_live_chat', pg_catalog.left(coalesce(p_target_label, 'YouTube live chat'), 100), 'succeeded', p_metadata || jsonb_build_object('live_chat_id', p_live_chat_id));
  return true;
end;
$$;

revoke all on function public.get_current_live_session() from public, anon, authenticated, service_role;
revoke all on function public.list_live_chat_messages(uuid, bigint, integer) from public, anon, authenticated, service_role;
revoke all on function public.send_live_chat_message(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.admin_configure_live_session(uuid, timestamptz, text, public.live_source, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.admin_set_live_status(uuid, timestamptz, public.live_status) from public, anon, authenticated, service_role;
revoke all on function public.moderator_delete_live_chat_message(bigint) from public, anon, authenticated, service_role;
revoke all on function public.moderator_restrict_live_chat_user(uuid, uuid, text, integer) from public, anon, authenticated, service_role;
revoke all on function public.moderator_unrestrict_live_chat_user(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.record_youtube_moderation_action(text, text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.get_current_live_session() to anon, authenticated;
grant execute on function public.list_live_chat_messages(uuid, bigint, integer) to anon, authenticated;
grant execute on function public.send_live_chat_message(uuid, text) to authenticated;
grant execute on function public.admin_configure_live_session(uuid, timestamptz, text, public.live_source, text, text, text) to authenticated;
grant execute on function public.admin_set_live_status(uuid, timestamptz, public.live_status) to authenticated;
grant execute on function public.moderator_delete_live_chat_message(bigint) to authenticated;
grant execute on function public.moderator_restrict_live_chat_user(uuid, uuid, text, integer) to authenticated;
grant execute on function public.moderator_unrestrict_live_chat_user(uuid, uuid) to authenticated;
grant execute on function public.record_youtube_moderation_action(text, text, text, jsonb) to authenticated;

commit;
