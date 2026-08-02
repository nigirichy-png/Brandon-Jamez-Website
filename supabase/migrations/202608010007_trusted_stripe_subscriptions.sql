-- Trusted Stripe subscription synchronization and paid-entitlement foundation.
-- No Checkout session or browser input can activate access. Only the verified
-- Stripe webhook calls process_stripe_subscription_event as service_role.

begin;

alter table public.subscriptions
  alter column status drop default;

alter type public.subscription_status rename to subscription_status_legacy;

create type public.subscription_status as enum (
  'inactive',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'canceled',
  'paused',
  'expired'
);

alter table public.subscriptions
  alter column status type public.subscription_status
  using status::text::public.subscription_status;

alter table public.subscriptions
  alter column status set default 'inactive'::public.subscription_status;

drop type public.subscription_status_legacy;

alter table public.subscriptions
  rename column provider_customer_reference to stripe_customer_id;

alter table public.subscriptions
  rename column provider_subscription_reference to stripe_subscription_id;

alter table public.subscriptions
  add column stripe_price_id text,
  add column current_period_start timestamptz,
  add column canceled_at timestamptz,
  add column ended_at timestamptz,
  add column webhook_event_created_at timestamptz,
  add column last_synced_at timestamptz,
  add column last_checkout_started_at timestamptz;

-- No existing row was written by a verified Stripe webhook. Preserve the
-- account relationship while invalidating all untrusted entitlement state.
update public.subscriptions
set provider = 'stripe',
    stripe_customer_id = null,
    stripe_subscription_id = null,
    stripe_price_id = null,
    status = 'inactive'::public.subscription_status,
    current_period_start = null,
    current_period_end = null,
    cancel_at_period_end = false,
    canceled_at = null,
    ended_at = null,
    webhook_event_created_at = null,
    last_synced_at = null;

alter table public.subscriptions
  add constraint subscriptions_provider_stripe_check check (provider = 'stripe'),
  add constraint subscriptions_stripe_customer_id_check check (
    stripe_customer_id is null
    or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'
  ),
  add constraint subscriptions_stripe_subscription_id_check check (
    stripe_subscription_id is null
    or stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'
  ),
  add constraint subscriptions_stripe_price_id_check check (
    stripe_price_id is null
    or stripe_price_id ~ '^price_[A-Za-z0-9]+$'
  ),
  add constraint subscriptions_period_check check (
    (current_period_start is null and current_period_end is null)
    or (
      current_period_start is not null
      and current_period_end is not null
      and current_period_end > current_period_start
    )
  ),
  add constraint subscriptions_synced_state_check check (
    status = 'inactive'::public.subscription_status
    or (
      stripe_customer_id is not null
      and stripe_subscription_id is not null
      and stripe_price_id is not null
      and webhook_event_created_at is not null
      and last_synced_at is not null
    )
  ),
  add constraint subscriptions_active_period_check check (
    status <> 'active'::public.subscription_status
    or (current_period_start is not null and current_period_end is not null)
  );

create unique index subscriptions_stripe_customer_unique_idx
  on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index subscriptions_stripe_subscription_unique_idx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index subscriptions_paid_access_idx
  on public.subscriptions (status, current_period_end)
  where status = 'active'::public.subscription_status;

comment on table public.subscriptions is
  'Stripe-backed subscription state. Entitlement is granted only by private.has_active_paid_subscription after verified webhook synchronization.';
comment on column public.subscriptions.last_checkout_started_at is
  'Server-side checkout throttling timestamp. It is not evidence of payment or entitlement.';

create table public.stripe_webhook_events (
  stripe_event_id text primary key check (stripe_event_id ~ '^evt_[A-Za-z0-9]+$'),
  event_type text not null check (
    char_length(event_type) between 3 and 100
    and event_type ~ '^[a-z0-9_.]+$'
  ),
  event_created_at timestamptz not null,
  processed_at timestamptz not null default now(),
  processing_result text not null check (
    processing_result in ('processed', 'duplicate', 'ignored', 'ignored_stale')
  ),
  target_user_id uuid references auth.users (id) on delete set null,
  stripe_customer_id text check (
    stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'
  ),
  stripe_subscription_id text check (
    stripe_subscription_id is null or stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'
  )
);

create index stripe_webhook_events_processed_idx
  on public.stripe_webhook_events (processed_at desc);

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from public, anon, authenticated, service_role;

comment on table public.stripe_webhook_events is
  'Data-minimized Stripe event ledger for idempotency. Full webhook payloads and billing PII are never stored.';

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
    'cms.video_reordered',
    'subscription.checkout_started',
    'subscription.portal_opened',
    'subscription.state_synced'
  ));

create function private.has_active_paid_subscription(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and not exists (
      select 1
      from public.account_restrictions as restrictions
      where restrictions.user_id = p_user_id
        and restrictions.blocked
    )
    and exists (
      select 1
      from public.subscriptions as subscriptions
      where subscriptions.user_id = p_user_id
        and subscriptions.provider = 'stripe'
        and subscriptions.stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'
        and subscriptions.stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'
        and subscriptions.stripe_price_id ~ '^price_[A-Za-z0-9]+$'
        and subscriptions.status = 'active'::public.subscription_status
        and subscriptions.current_period_start is not null
        and subscriptions.current_period_end is not null
        and subscriptions.current_period_end > pg_catalog.statement_timestamp()
        and subscriptions.webhook_event_created_at is not null
        and subscriptions.webhook_event_created_at <= pg_catalog.statement_timestamp() + interval '5 minutes'
        and subscriptions.last_synced_at is not null
        and subscriptions.last_synced_at >= subscriptions.webhook_event_created_at
        and subscriptions.last_synced_at <= pg_catalog.statement_timestamp() + interval '5 minutes'
    );
$$;

revoke all on function private.has_active_paid_subscription(uuid)
  from public, anon, authenticated, service_role;

create function public.has_active_paid_subscription()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_active_paid_subscription((select auth.uid()));
$$;

revoke all on function public.has_active_paid_subscription()
  from public, anon, authenticated, service_role;
grant execute on function public.has_active_paid_subscription() to authenticated;

create function private.append_subscription_audit(
  p_action text,
  p_actor_id uuid,
  p_target_user_id uuid,
  p_metadata jsonb
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
    actor_user_id,
    actor_role_snapshot,
    action,
    target_type,
    target_user_id,
    result,
    metadata
  ) values (
    p_actor_id,
    actor_roles,
    p_action,
    'account',
    p_target_user_id,
    'succeeded',
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function private.append_subscription_audit(text, uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;

create function public.get_own_stripe_billing_context()
returns table (
  stripe_customer_id text,
  status public.subscription_status,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  has_active_access boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if exists (
    select 1 from public.account_restrictions
    where user_id = actor_id and blocked
  ) then
    raise exception using errcode = '42501', message = 'account_restricted';
  end if;

  return query
  select
    subscriptions.stripe_customer_id,
    coalesce(subscriptions.status, 'inactive'::public.subscription_status),
    subscriptions.current_period_end,
    coalesce(subscriptions.cancel_at_period_end, false),
    private.has_active_paid_subscription(actor_id)
  from (select actor_id as user_id) as actor
  left join public.subscriptions as subscriptions using (user_id);
end;
$$;

create function public.begin_own_stripe_checkout()
returns table (stripe_customer_id text, has_active_access boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  subscription_row public.subscriptions%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if exists (
    select 1 from public.account_restrictions
    where user_id = actor_id and blocked
  ) then
    raise exception using errcode = '42501', message = 'account_restricted';
  end if;

  select * into subscription_row
  from public.subscriptions
  where user_id = actor_id
  for update;

  if found
    and subscription_row.last_checkout_started_at is not null
    and subscription_row.last_checkout_started_at > now() - interval '60 seconds'
  then
    raise exception using errcode = '55000', message = 'checkout_rate_limited';
  end if;

  insert into public.subscriptions (
    user_id,
    provider,
    status,
    last_checkout_started_at
  ) values (
    actor_id,
    'stripe',
    'inactive'::public.subscription_status,
    now()
  )
  on conflict (user_id) do update
  set last_checkout_started_at = excluded.last_checkout_started_at;

  perform private.append_subscription_audit(
    'subscription.checkout_started',
    actor_id,
    actor_id,
    '{}'::jsonb
  );

  return query
  select
    subscriptions.stripe_customer_id,
    private.has_active_paid_subscription(actor_id)
  from public.subscriptions as subscriptions
  where subscriptions.user_id = actor_id;
end;
$$;

create function public.bind_own_stripe_customer(p_stripe_customer_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing_customer text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if exists (
    select 1 from public.account_restrictions
    where user_id = actor_id and blocked
  ) then
    raise exception using errcode = '42501', message = 'account_restricted';
  end if;

  if p_stripe_customer_id is null
    or p_stripe_customer_id !~ '^cus_[A-Za-z0-9]+$'
  then
    raise exception using errcode = '22023', message = 'invalid_stripe_customer';
  end if;

  select stripe_customer_id into existing_customer
  from public.subscriptions
  where user_id = actor_id
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'checkout_not_started';
  end if;

  if existing_customer is not null and existing_customer <> p_stripe_customer_id then
    raise exception using errcode = '23505', message = 'stripe_customer_conflict';
  end if;

  update public.subscriptions
  set stripe_customer_id = p_stripe_customer_id
  where user_id = actor_id
    and stripe_customer_id is null;

  return found;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'stripe_customer_conflict';
end;
$$;

create function public.begin_own_stripe_portal()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  customer_id text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if exists (
    select 1 from public.account_restrictions
    where user_id = actor_id and blocked
  ) then
    raise exception using errcode = '42501', message = 'account_restricted';
  end if;

  select stripe_customer_id into customer_id
  from public.subscriptions
  where user_id = actor_id;

  if customer_id is null then
    raise exception using errcode = 'P0002', message = 'stripe_customer_not_found';
  end if;

  perform private.append_subscription_audit(
    'subscription.portal_opened',
    actor_id,
    actor_id,
    '{}'::jsonb
  );

  return customer_id;
end;
$$;

create function public.process_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_processing_result text,
  p_user_id uuid default null,
  p_stripe_customer_id text default null,
  p_stripe_subscription_id text default null,
  p_stripe_price_id text default null,
  p_status public.subscription_status default null,
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_canceled_at timestamptz default null,
  p_ended_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_user_id uuid := p_user_id;
  existing_row public.subscriptions%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using errcode = '42501', message = 'trusted_webhook_required';
  end if;

  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9]+$'
    or p_event_type is null or p_event_type !~ '^[a-z0-9_.]{3,100}$'
    or p_event_created_at is null
    or p_event_created_at > now() + interval '5 minutes'
    or p_processing_result not in ('processed', 'ignored')
  then
    raise exception using errcode = '22023', message = 'invalid_stripe_event';
  end if;

  insert into public.stripe_webhook_events (
    stripe_event_id,
    event_type,
    event_created_at,
    processing_result,
    target_user_id,
    stripe_customer_id,
    stripe_subscription_id
  ) values (
    p_event_id,
    p_event_type,
    p_event_created_at,
    p_processing_result,
    v_target_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id
  )
  on conflict (stripe_event_id) do nothing;

  if not found then
    return 'duplicate';
  end if;

  if p_processing_result = 'ignored' then
    return 'ignored';
  end if;

  if p_stripe_customer_id is null
    or p_stripe_customer_id !~ '^cus_[A-Za-z0-9]+$'
    or p_stripe_subscription_id is null
    or p_stripe_subscription_id !~ '^sub_[A-Za-z0-9]+$'
  then
    raise exception using errcode = '22023', message = 'invalid_stripe_mapping';
  end if;

  if v_target_user_id is null then
    select user_id into v_target_user_id
    from public.subscriptions
    where stripe_subscription_id = p_stripe_subscription_id
      and stripe_customer_id = p_stripe_customer_id;
  end if;

  if v_target_user_id is null
    or not exists (select 1 from auth.users where id = v_target_user_id)
  then
    raise exception using errcode = '22023', message = 'invalid_stripe_user_mapping';
  end if;

  if exists (
    select 1 from public.subscriptions
    where user_id <> v_target_user_id
      and (
        stripe_customer_id = p_stripe_customer_id
        or stripe_subscription_id = p_stripe_subscription_id
      )
  ) then
    raise exception using errcode = '23505', message = 'stripe_mapping_conflict';
  end if;

  select * into existing_row
  from public.subscriptions
  where user_id = v_target_user_id
  for update;

  if found
    and existing_row.stripe_customer_id is not null
    and existing_row.stripe_customer_id <> p_stripe_customer_id
  then
    raise exception using errcode = '23505', message = 'stripe_customer_conflict';
  end if;

  if found
    and existing_row.webhook_event_created_at is not null
    and p_event_created_at <= existing_row.webhook_event_created_at
  then
    update public.stripe_webhook_events
    set processing_result = 'ignored_stale',
        target_user_id = v_target_user_id
    where stripe_event_id = p_event_id;
    return 'ignored_stale';
  end if;

  if p_status is null
    or p_stripe_price_id is null
    or p_stripe_price_id !~ '^price_[A-Za-z0-9]+$'
    or p_current_period_start is null
    or p_current_period_end is null
    or p_current_period_end <= p_current_period_start
  then
    raise exception using errcode = '22023', message = 'invalid_stripe_subscription_state';
  end if;

  insert into public.subscriptions (
    user_id,
    provider,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at,
    ended_at,
    webhook_event_created_at,
    last_synced_at
  ) values (
    v_target_user_id,
    'stripe',
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_stripe_price_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    coalesce(p_cancel_at_period_end, false),
    p_canceled_at,
    p_ended_at,
    p_event_created_at,
    now()
  )
  on conflict (user_id) do update
  set provider = excluded.provider,
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      stripe_price_id = excluded.stripe_price_id,
      status = excluded.status,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      canceled_at = excluded.canceled_at,
      ended_at = excluded.ended_at,
      webhook_event_created_at = excluded.webhook_event_created_at,
      last_synced_at = excluded.last_synced_at;

  update public.stripe_webhook_events
  set target_user_id = v_target_user_id
  where stripe_event_id = p_event_id;

  perform private.append_subscription_audit(
    'subscription.state_synced',
    null,
    v_target_user_id,
    pg_catalog.jsonb_build_object(
      'event_type', p_event_type,
      'status', p_status::text,
      'cancel_at_period_end', coalesce(p_cancel_at_period_end, false)
    )
  );

  return 'processed';
end;
$$;

revoke all on function public.get_own_stripe_billing_context()
  from public, anon, authenticated, service_role;
revoke all on function public.begin_own_stripe_checkout()
  from public, anon, authenticated, service_role;
revoke all on function public.bind_own_stripe_customer(text)
  from public, anon, authenticated, service_role;
revoke all on function public.begin_own_stripe_portal()
  from public, anon, authenticated, service_role;
revoke all on function public.process_stripe_subscription_event(
  text,
  text,
  timestamptz,
  text,
  uuid,
  text,
  text,
  text,
  public.subscription_status,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz,
  timestamptz
) from public, anon, authenticated, service_role;

grant execute on function public.get_own_stripe_billing_context() to authenticated;
grant execute on function public.begin_own_stripe_checkout() to authenticated;
grant execute on function public.bind_own_stripe_customer(text) to authenticated;
grant execute on function public.begin_own_stripe_portal() to authenticated;
grant execute on function public.process_stripe_subscription_event(
  text,
  text,
  timestamptz,
  text,
  uuid,
  text,
  text,
  text,
  public.subscription_status,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz,
  timestamptz
) to service_role;

comment on function private.has_active_paid_subscription(uuid) is
  'Fail-closed Stripe paid-entitlement check. Active status, complete identifiers, future period, consistent webhook sync, and an unrestricted account are required. Trialing is denied.';
comment on function public.process_stripe_subscription_event(
  text,
  text,
  timestamptz,
  text,
  uuid,
  text,
  text,
  text,
  public.subscription_status,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz,
  timestamptz
) is
  'Service-role-only scalar synchronization boundary for an already signature-verified Stripe event. Persists idempotency and state atomically without raw payloads.';

commit;
