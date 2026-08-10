begin;

create type public.vip_offer_code as enum ('vip_membership', 'platinum_sponsor');
create type public.vip_order_status as enum ('pending', 'paid', 'expired', 'canceled', 'refunded');

create table private.vip_commerce_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  offer_code public.vip_offer_code not null,
  status public.vip_order_status not null default 'pending',
  stripe_customer_id text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  checkout_expires_at timestamptz not null default (now() + interval '31 minutes'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vip_order_customer_check check (stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  constraint vip_order_session_check check (stripe_checkout_session_id is null or stripe_checkout_session_id ~ '^cs_(test|live)_[A-Za-z0-9]+$'),
  constraint vip_order_payment_intent_check check (stripe_payment_intent_id is null or stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
  constraint vip_order_state_check check (
    (status = 'paid'::public.vip_order_status and paid_at is not null and stripe_checkout_session_id is not null and stripe_payment_intent_id is not null)
    or (status <> 'paid'::public.vip_order_status and paid_at is null)
  )
);

create index vip_commerce_orders_user_idx on private.vip_commerce_orders (user_id, created_at desc);
create index vip_commerce_orders_capacity_idx on private.vip_commerce_orders (offer_code, status, checkout_expires_at);
create unique index vip_commerce_one_paid_membership_per_user
  on private.vip_commerce_orders (user_id, offer_code)
  where offer_code = 'vip_membership'::public.vip_offer_code and status = 'paid'::public.vip_order_status;

revoke all on table private.vip_commerce_orders from public, anon, authenticated, service_role;

alter table public.audit_events drop constraint audit_events_action_check;
alter table public.audit_events add constraint audit_events_action_check check (action in (
  'profile.display_name_updated', 'role.assigned', 'role.removed', 'account.blocked', 'account.restored',
  'account.email_change_requested', 'cms.video_created', 'cms.video_updated', 'cms.video_published',
  'cms.video_unpublished', 'cms.video_deleted', 'cms.video_featured', 'cms.video_unfeatured', 'cms.video_reordered',
  'subscription.checkout_started', 'subscription.portal_opened', 'subscription.state_synced',
  'commerce.checkout_started', 'commerce.checkout_expired', 'commerce.vip_activated', 'commerce.sponsor_activated',
  'subscriber.post_created', 'subscriber.post_updated', 'subscriber.post_published', 'subscriber.post_unpublished', 'subscriber.post_deleted',
  'subscriber.bunny_video_upload_started', 'subscriber.bunny_video_updated', 'subscriber.bunny_video_published',
  'subscriber.bunny_video_unpublished', 'subscriber.bunny_video_removed',
  'moderation.case_created', 'moderation.case_updated', 'moderation.case_assigned', 'moderation.case_unassigned',
  'moderation.case_status_changed', 'moderation.case_deleted',
  'cms.event_created', 'cms.event_updated', 'cms.event_published', 'cms.event_unpublished', 'cms.event_archived', 'cms.event_restored', 'cms.event_deleted',
  'live.session_configured', 'live.session_status_changed', 'live.chat_message_deleted', 'live.chat_user_timed_out', 'live.chat_user_banned', 'live.chat_user_unrestricted',
  'youtube.chat_message_deleted', 'youtube.chat_user_timed_out', 'youtube.chat_user_hidden', 'youtube.chat_message_sent'
));

alter table public.audit_events drop constraint audit_events_target_type_check;
alter table public.audit_events add constraint audit_events_target_type_check check (
  target_type in ('account', 'profile', 'cms_video', 'subscriber_post', 'subscriber_video', 'commerce_order', 'moderation_case', 'cms_event', 'live_session', 'youtube_live_chat')
);
alter table public.audit_events drop constraint audit_events_target_reference_check;
alter table public.audit_events add constraint audit_events_target_reference_check check (
  (target_type in ('cms_video', 'subscriber_post', 'subscriber_video', 'commerce_order', 'moderation_case', 'cms_event', 'live_session') and target_resource_id is not null and target_user_id is null)
  or (target_type in ('account', 'profile') and target_resource_id is null)
  or (target_type = 'youtube_live_chat' and target_resource_id is null and target_user_id is null)
);

create function private.append_vip_commerce_audit(p_action text, p_order_id uuid, p_label text)
returns void language plpgsql set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); actor_roles public.app_role[];
begin
  select coalesce(array_agg(role order by role::text), '{}'::public.app_role[]) into actor_roles
  from public.user_roles where user_id = actor_id;
  insert into public.audit_events (actor_user_id, actor_role_snapshot, action, target_type, target_resource_id, target_label_snapshot, result, metadata)
  values (actor_id, actor_roles, p_action, 'commerce_order', p_order_id, pg_catalog.left(p_label, 100), 'succeeded', '{}'::jsonb);
end;
$$;
revoke all on function private.append_vip_commerce_audit(text, uuid, text) from public, anon, authenticated, service_role;

create function public.get_vip_offer_availability()
returns table (offer_code public.vip_offer_code, capacity integer, remaining integer)
language sql stable security definer set search_path = '' as $$
  select offers.offer_code, offers.capacity,
    case when offers.capacity is null then null
      else pg_catalog.greatest(0, offers.capacity - count(orders.id)::integer) end
  from (values
    ('vip_membership'::public.vip_offer_code, null::integer),
    ('platinum_sponsor'::public.vip_offer_code, 6::integer)
  ) as offers(offer_code, capacity)
  left join private.vip_commerce_orders as orders on orders.offer_code = offers.offer_code
    and (orders.status = 'paid'::public.vip_order_status
      or (orders.status = 'pending'::public.vip_order_status and orders.checkout_expires_at > now()))
  group by offers.offer_code, offers.capacity order by offers.offer_code;
$$;

create function public.get_own_vip_orders()
returns table (id uuid, offer_code public.vip_offer_code, status public.vip_order_status, paid_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  return query select orders.id, orders.offer_code, orders.status, orders.paid_at, orders.created_at
  from private.vip_commerce_orders as orders where orders.user_id = (select auth.uid()) order by orders.created_at desc;
end;
$$;

create function public.begin_own_vip_checkout(p_offer_code public.vip_offer_code)
returns table (order_id uuid, stripe_customer_id text)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); new_order_id uuid; customer_id text; reserved_count integer;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if exists (select 1 from public.account_restrictions where user_id = actor_id and blocked) then
    raise exception using errcode = '42501', message = 'account_restricted';
  end if;
  if not exists (select 1 from public.age_verifications where user_id = actor_id and status = 'verified'::public.age_verification_status and age_verified and (expires_at is null or expires_at > now())) then
    raise exception using errcode = '42501', message = 'age_verification_required';
  end if;
  if exists (select 1 from private.vip_commerce_orders where user_id = actor_id and created_at > now() - interval '60 seconds') then
    raise exception using errcode = '55000', message = 'commerce_checkout_rate_limited';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('vip-commerce-' || p_offer_code::text));
  update private.vip_commerce_orders set status = 'expired'::public.vip_order_status, updated_at = now()
  where status = 'pending'::public.vip_order_status and checkout_expires_at <= now();
  if p_offer_code = 'vip_membership'::public.vip_offer_code and exists (
    select 1 from private.vip_commerce_orders where user_id = actor_id and offer_code = p_offer_code and status = 'paid'::public.vip_order_status
  ) then raise exception using errcode = '23505', message = 'vip_membership_already_active'; end if;
  if p_offer_code = 'platinum_sponsor'::public.vip_offer_code then
    select count(*)::integer into reserved_count from private.vip_commerce_orders where offer_code = p_offer_code
      and (status = 'paid'::public.vip_order_status or (status = 'pending'::public.vip_order_status and checkout_expires_at > now()));
    if reserved_count >= 6 then raise exception using errcode = '55000', message = 'platinum_sponsor_sold_out'; end if;
  end if;
  insert into private.vip_commerce_orders (user_id, offer_code) values (actor_id, p_offer_code) returning id into new_order_id;
  select subscriptions.stripe_customer_id into customer_id from public.subscriptions where user_id = actor_id;
  perform private.append_vip_commerce_audit('commerce.checkout_started', new_order_id, p_offer_code::text);
  return query select new_order_id, customer_id;
end;
$$;

create function public.bind_own_vip_customer(p_order_id uuid, p_stripe_customer_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); existing_customer text;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if p_stripe_customer_id !~ '^cus_[A-Za-z0-9]+$' then raise exception using errcode = '22023', message = 'invalid_stripe_customer'; end if;
  if not exists (select 1 from private.vip_commerce_orders where id = p_order_id and user_id = actor_id and status = 'pending'::public.vip_order_status) then
    raise exception using errcode = 'P0002', message = 'commerce_order_not_found';
  end if;
  select stripe_customer_id into existing_customer from public.subscriptions where user_id = actor_id for update;
  if found and existing_customer is not null and existing_customer <> p_stripe_customer_id then raise exception using errcode = '23505', message = 'stripe_customer_conflict'; end if;
  insert into public.subscriptions (user_id, provider, status, stripe_customer_id)
  values (actor_id, 'stripe', 'inactive'::public.subscription_status, p_stripe_customer_id)
  on conflict (user_id) do update set stripe_customer_id = coalesce(public.subscriptions.stripe_customer_id, excluded.stripe_customer_id);
  update private.vip_commerce_orders set stripe_customer_id = p_stripe_customer_id, updated_at = now() where id = p_order_id;
  return true;
exception when unique_violation then raise exception using errcode = '23505', message = 'stripe_customer_conflict';
end;
$$;

create function public.bind_own_vip_checkout_session(p_order_id uuid, p_stripe_checkout_session_id text, p_checkout_expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); changed_count integer;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if p_stripe_checkout_session_id !~ '^cs_(test|live)_[A-Za-z0-9]+$' or p_checkout_expires_at < now() + interval '25 minutes' or p_checkout_expires_at > now() + interval '24 hours 5 minutes' then
    raise exception using errcode = '22023', message = 'invalid_checkout_session';
  end if;
  update private.vip_commerce_orders set stripe_checkout_session_id = p_stripe_checkout_session_id,
    checkout_expires_at = p_checkout_expires_at, updated_at = now()
  where id = p_order_id and user_id = actor_id and status = 'pending'::public.vip_order_status and stripe_customer_id is not null;
  get diagnostics changed_count = row_count;
  if changed_count <> 1 then raise exception using errcode = 'P0002', message = 'commerce_order_not_found'; end if;
  return true;
end;
$$;

create function public.cancel_own_vip_checkout(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  update private.vip_commerce_orders set status = 'canceled'::public.vip_order_status, updated_at = now()
  where id = p_order_id and user_id = (select auth.uid()) and status = 'pending'::public.vip_order_status;
  return found;
end;
$$;

create function public.process_stripe_vip_checkout_event(p_event_id text, p_event_type text, p_event_created_at timestamptz,
  p_processing_result text, p_order_id uuid default null, p_user_id uuid default null, p_offer_code public.vip_offer_code default null,
  p_stripe_customer_id text default null, p_stripe_checkout_session_id text default null, p_stripe_payment_intent_id text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare order_row private.vip_commerce_orders%rowtype; next_action text;
begin
  if (select auth.role()) <> 'service_role' then raise exception using errcode = '42501', message = 'trusted_webhook_required'; end if;
  if p_event_id !~ '^evt_[A-Za-z0-9]+$' or p_event_type not in ('checkout.session.completed', 'checkout.session.expired')
    or p_event_created_at is null or p_event_created_at > now() + interval '5 minutes' or p_processing_result not in ('processed', 'ignored') then
    raise exception using errcode = '22023', message = 'invalid_stripe_event';
  end if;
  insert into public.stripe_webhook_events (stripe_event_id, event_type, event_created_at, processing_result, target_user_id, stripe_customer_id)
  values (p_event_id, p_event_type, p_event_created_at, p_processing_result, p_user_id, p_stripe_customer_id) on conflict (stripe_event_id) do nothing;
  if not found then return 'duplicate'; end if;
  if p_processing_result = 'ignored' then return 'ignored'; end if;
  select * into order_row from private.vip_commerce_orders where id = p_order_id for update;
  if not found or order_row.user_id <> p_user_id or order_row.offer_code <> p_offer_code
    or order_row.stripe_customer_id <> p_stripe_customer_id or order_row.stripe_checkout_session_id <> p_stripe_checkout_session_id then
    raise exception using errcode = '22023', message = 'invalid_commerce_mapping';
  end if;
  if p_event_type = 'checkout.session.completed' then
    if p_stripe_payment_intent_id !~ '^pi_[A-Za-z0-9]+$' then raise exception using errcode = '22023', message = 'invalid_payment_intent'; end if;
    if order_row.status = 'paid'::public.vip_order_status then return 'duplicate'; end if;
    if order_row.status <> 'pending'::public.vip_order_status then raise exception using errcode = '55000', message = 'commerce_order_not_pending'; end if;
    update private.vip_commerce_orders set status = 'paid'::public.vip_order_status, stripe_payment_intent_id = p_stripe_payment_intent_id,
      paid_at = p_event_created_at, updated_at = now() where id = p_order_id;
    next_action := case when p_offer_code = 'vip_membership'::public.vip_offer_code then 'commerce.vip_activated' else 'commerce.sponsor_activated' end;
    perform private.append_vip_commerce_audit(next_action, p_order_id, p_offer_code::text);
    return 'processed';
  end if;
  if order_row.status = 'pending'::public.vip_order_status then
    update private.vip_commerce_orders set status = 'expired'::public.vip_order_status, updated_at = now() where id = p_order_id;
    perform private.append_vip_commerce_audit('commerce.checkout_expired', p_order_id, p_offer_code::text);
  end if;
  return 'processed';
end;
$$;

revoke all on function public.get_vip_offer_availability() from public, anon, authenticated, service_role;
revoke all on function public.get_own_vip_orders() from public, anon, authenticated, service_role;
revoke all on function public.begin_own_vip_checkout(public.vip_offer_code) from public, anon, authenticated, service_role;
revoke all on function public.bind_own_vip_customer(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.bind_own_vip_checkout_session(uuid, text, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.cancel_own_vip_checkout(uuid) from public, anon, authenticated, service_role;
revoke all on function public.process_stripe_vip_checkout_event(text, text, timestamptz, text, uuid, uuid, public.vip_offer_code, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.get_vip_offer_availability() to anon, authenticated;
grant execute on function public.get_own_vip_orders() to authenticated;
grant execute on function public.begin_own_vip_checkout(public.vip_offer_code) to authenticated;
grant execute on function public.bind_own_vip_customer(uuid, text) to authenticated;
grant execute on function public.bind_own_vip_checkout_session(uuid, text, timestamptz) to authenticated;
grant execute on function public.cancel_own_vip_checkout(uuid) to authenticated;
grant execute on function public.process_stripe_vip_checkout_event(text, text, timestamptz, text, uuid, uuid, public.vip_offer_code, text, text, text) to service_role;

comment on table private.vip_commerce_orders is 'Server-only Stripe test commerce orders. VIP entitlements never grant staff roles or subscriber access.';

commit;
