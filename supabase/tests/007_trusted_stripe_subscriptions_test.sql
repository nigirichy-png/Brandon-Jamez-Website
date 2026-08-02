begin;

create extension if not exists pgtap with schema extensions;
select plan(43);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'one@example.invalid', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'two@example.invalid', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'three@example.invalid', '', now(), now(), now());

insert into public.subscriptions (
  user_id, provider, stripe_customer_id, stripe_subscription_id,
  stripe_price_id, status, current_period_start, current_period_end,
  cancel_at_period_end, webhook_event_created_at, last_synced_at
) values (
  '10000000-0000-0000-0000-000000000001', 'stripe', 'cus_TestOne',
  'sub_TestOne', 'price_TestOne', 'active', statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '1 day', false, statement_timestamp(), statement_timestamp()
);

select ok(
  private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'),
  'active Stripe subscription with a future period is entitled'
);

update public.subscriptions
set current_period_end = statement_timestamp(),
    current_period_start = statement_timestamp() - interval '1 day'
where user_id = '10000000-0000-0000-0000-000000000001';
select is(
  private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'),
  false,
  'exact current_period_end boundary is denied'
);

update public.subscriptions
set current_period_end = statement_timestamp() + interval '1 day',
    cancel_at_period_end = true
where user_id = '10000000-0000-0000-0000-000000000001';
select ok(
  private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'),
  'cancel_at_period_end remains entitled before period end'
);

update public.subscriptions set current_period_end = statement_timestamp() - interval '1 second', current_period_start = statement_timestamp() - interval '1 day'
where user_id = '10000000-0000-0000-0000-000000000001';
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'), false, 'past period is denied');

update public.subscriptions set current_period_start = statement_timestamp() - interval '1 day', current_period_end = statement_timestamp() + interval '1 day'
where user_id = '10000000-0000-0000-0000-000000000001';

select lives_ok($$update public.subscriptions set status = 'active' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'active fixture restored');
select lives_ok($$update public.subscriptions set status = 'past_due' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'past_due is representable');
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'), false, 'past_due is denied');
select lives_ok($$update public.subscriptions set status = 'unpaid' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'unpaid is representable');
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'), false, 'unpaid is denied');
select lives_ok($$update public.subscriptions set status = 'trialing' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'trialing is representable');
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'), false, 'trialing is denied');
select lives_ok($$update public.subscriptions set status = 'paused' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'paused is representable');
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'), false, 'paused is denied');
select lives_ok($$update public.subscriptions set status = 'incomplete' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'incomplete is representable');
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'), false, 'incomplete is denied');
select lives_ok($$update public.subscriptions set status = 'incomplete_expired' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'incomplete_expired is representable');
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'), false, 'incomplete_expired is denied');
select lives_ok($$update public.subscriptions set status = 'canceled' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'canceled is representable');
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'), false, 'canceled is denied');
select lives_ok($$update public.subscriptions set status = 'expired' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'expired is representable');
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'), false, 'expired is denied');

insert into public.user_roles (user_id, role)
values ('10000000-0000-0000-0000-000000000003', 'subscriber');
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000003'), false, 'subscriber role alone never grants paid access');

update public.subscriptions set status = 'active' where user_id = '10000000-0000-0000-0000-000000000001';
insert into public.account_restrictions (user_id, blocked, reason, blocked_at)
values ('10000000-0000-0000-0000-000000000001', true, 'Test restriction', now());
select is(private.has_active_paid_subscription('10000000-0000-0000-0000-000000000001'), false, 'blocked active subscriber is denied');
delete from public.account_restrictions where user_id = '10000000-0000-0000-0000-000000000001';

select throws_ok(
  $$insert into public.subscriptions (user_id, provider, status, current_period_start, current_period_end) values ('10000000-0000-0000-0000-000000000002', 'stripe', 'active', now(), now() + interval '1 day')$$,
  '23514'
);

select throws_ok(
  $$insert into public.subscriptions (user_id, provider, stripe_customer_id, stripe_subscription_id, status) values ('10000000-0000-0000-0000-000000000002', 'stripe', 'cus_TestOne', 'sub_TestTwo', 'inactive')$$,
  '23505'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.subscriptions (user_id, provider) values ('10000000-0000-0000-0000-000000000002', 'stripe')$$,
  '42501'
);
select throws_ok(
  $$update public.subscriptions set status = 'active' where user_id = '10000000-0000-0000-0000-000000000001'$$,
  '42501'
);
select throws_ok(
  $$delete from public.subscriptions where user_id = '10000000-0000-0000-0000-000000000001'$$,
  '42501'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is(
  (select has_active_access from public.begin_own_stripe_checkout()),
  false,
  'authenticated unrestricted user can begin a fail-closed checkout attempt'
);
select is(
  (select status::text from public.subscriptions where user_id = '10000000-0000-0000-0000-000000000003'),
  'inactive',
  'checkout initiation creates only an inactive non-entitled row'
);
select ok(
  public.bind_own_stripe_customer('cus_CheckoutThree'),
  'authenticated user can bind the Stripe customer created by the server checkout path'
);
select is(
  (select stripe_customer_id from public.get_own_stripe_billing_context()),
  'cus_CheckoutThree',
  'billing context returns only the caller customer mapping'
);
select is(
  public.begin_own_stripe_portal(),
  'cus_CheckoutThree',
  'portal initiation reuses the caller stored customer mapping'
);
select throws_ok(
  $$select * from public.begin_own_stripe_checkout()$$,
  '55000',
  'checkout_rate_limited',
  'checkout initiation is throttled'
);
select throws_ok(
  $$select public.bind_own_stripe_customer('cus_DifferentCustomer')$$,
  '23505',
  'stripe_customer_conflict',
  'an existing customer mapping cannot be replaced'
);
select throws_ok(
  $$select public.process_stripe_subscription_event('evt_AuthenticatedDenied', 'customer.subscription.updated', statement_timestamp(), 'ignored')$$,
  '42501',
  'permission denied for function process_stripe_subscription_event',
  'authenticated callers cannot invoke the trusted webhook writer'
);
reset role;

insert into public.account_restrictions (user_id, blocked, reason, blocked_at)
values ('10000000-0000-0000-0000-000000000003', true, 'Checkout restriction test', now());
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.begin_own_stripe_checkout()$$,
  '42501',
  'account_restricted',
  'blocked accounts cannot begin checkout'
);
reset role;
delete from public.account_restrictions where user_id = '10000000-0000-0000-0000-000000000003';

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(
  public.process_stripe_subscription_event(
    'evt_TestNewest', 'customer.subscription.updated', statement_timestamp(), 'processed',
    '10000000-0000-0000-0000-000000000002', 'cus_TestTwo', 'sub_TestTwo',
    'price_TestOne', 'active', statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '1 day', false, null, null
  ),
  'processed',
  'verified webhook boundary synchronizes valid scalar state'
);
select is(
  public.process_stripe_subscription_event(
    'evt_TestNewest', 'customer.subscription.updated', statement_timestamp(), 'processed',
    '10000000-0000-0000-0000-000000000002', 'cus_TestTwo', 'sub_TestTwo',
    'price_TestOne', 'active', statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '1 day', false, null, null
  ),
  'duplicate',
  'duplicate Stripe event is idempotent'
);
select is(
  public.process_stripe_subscription_event(
    'evt_TestOlder', 'customer.subscription.deleted', statement_timestamp() - interval '1 hour', 'processed',
    '10000000-0000-0000-0000-000000000002', 'cus_TestTwo', 'sub_TestTwo',
    'price_TestOne', 'canceled', statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '1 day', true, statement_timestamp(), statement_timestamp()
  ),
  'ignored_stale',
  'older event cannot regress newer subscription state'
);
select throws_ok(
  $$select public.process_stripe_subscription_event(
    'evt_TestConflict', 'customer.subscription.updated', statement_timestamp() + interval '1 second', 'processed',
    '10000000-0000-0000-0000-000000000003', 'cus_TestTwo', 'sub_TestThree',
    'price_TestOne', 'active', statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '1 day', false, null, null
  )$$,
  '23505'
);
reset role;

select is(
  (select status::text from public.subscriptions where user_id = '10000000-0000-0000-0000-000000000002'),
  'active',
  'stale canceled event did not overwrite active state'
);
select is(
  (select count(*)::integer from public.audit_events where action = 'subscription.state_synced' and target_user_id = '10000000-0000-0000-0000-000000000002'),
  1,
  'successful webhook synchronization creates one audit event'
);

select * from finish();
rollback;
