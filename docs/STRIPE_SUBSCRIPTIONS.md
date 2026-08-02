# Stripe subscription operations

## Status and entitlement

The repository contains a Stripe subscription foundation, but deploying code alone does not activate billing. Subscriber-video and private-media functionality remain separate future work.

Paid access is granted only when `private.has_active_paid_subscription(user_id)` confirms an unrestricted account, provider `stripe`, complete customer/subscription/Price identifiers, local status exactly `active`, `current_period_end` strictly later than the database statement timestamp, and internally consistent verified-webhook timestamps.

`trialing`, `incomplete`, `incomplete_expired`, `past_due`, `unpaid`, `paused`, `canceled`, `expired`, `inactive`, missing, and unknown state are denied. `cancel_at_period_end` remains entitled only while status is active and the paid period is in the future. A `subscriber` role never proves payment.

## Architecture

Authenticated Next.js Server Actions initiate Stripe-hosted Checkout and Customer Portal sessions. They accept no price, amount, currency, customer, success URL, cancel URL, or return URL from the browser. The recurring Price and approved site origin come only from server configuration.

`supabase/functions/stripe-webhook` is the only privileged subscription-state writer. It reads the raw body once, verifies `Stripe-Signature` with Stripe's official library, resolves subscription state, filters to the configured recurring Price, and calls `process_stripe_subscription_event` with validated scalar fields only.

The RPC requires `service_role`, enforces one-to-one user/customer/subscription mapping, records the event ID atomically, rejects stale events, updates subscription state, and appends a data-minimized audit event. It never stores full Stripe payloads, customer email, billing addresses, payment methods, or card information.

Handled events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`

Payment failures and payment-action requirements force fail-closed `past_due` state. Subscription events remain authoritative for recovery. Unrelated events and subscriptions for another Price are recorded as ignored. Transient Stripe or database failures return non-2xx so Stripe retries.

## Required variables

Never commit values. Use Stripe test mode until live activation is explicitly approved.

Vercel server configuration:

- `STRIPE_SECRET_KEY`
- `STRIPE_SUBSCRIPTION_PRICE_ID`
- `NEXT_PUBLIC_SITE_URL`
- the existing Supabase variables

Supabase Edge Function secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SUBSCRIPTION_PRICE_ID`

Supabase provides the function's project URL and secret/service credential. Neither belongs in browser code.

## Test-mode setup

1. In Stripe test mode, create or select one recurring Product and recurring Price.
2. Configure Customer Portal features in test mode.
3. Add the test secret key and Price ID to untracked local server configuration.
4. Start Supabase, reset the database, and serve `stripe-webhook` with an untracked test environment file.
5. Install or temporarily invoke the official Stripe CLI and authenticate to the test account.
6. Forward the required events to `http://127.0.0.1:54321/functions/v1/stripe-webhook`.
7. Store the CLI-provided test signing secret only in the untracked function environment.
8. Complete test Checkout, verify signed webhook synchronization, and open a test Portal session.
9. Test cancellation, payment failure, retries, duplicate delivery, stale delivery, and expiry boundaries.

Never use live mode for local tests.

## Dashboard and deployment checklist

Before test deployment:

- create the recurring test Product/Price;
- configure the test Customer Portal;
- add Vercel test variables securely;
- deploy migration 007 only after preflight confirms it is the sole pending migration;
- deploy `stripe-webhook` with JWT verification disabled for that function only;
- add Edge Function test secrets securely;
- register the function URL as a Stripe test webhook destination;
- select exactly the handled events listed above;
- complete test Checkout and verify webhook synchronization before exposing an enabled Subscribe button.

Before live activation:

- complete Stripe business verification;
- create a separate live recurring Product/Price;
- configure the live Customer Portal;
- register a separate live webhook destination and signing secret;
- configure live Supabase and Vercel secrets;
- review pricing, renewal, cancellation, refund, privacy, tax, and VAT obligations;
- obtain explicit approval for a low-risk end-to-end live test;
- confirm monitoring and support ownership for failed webhooks and payments.

## Safe inspection and emergency response

Inspect state through data-minimized account/admin views or reviewed SQL. Never copy raw payloads or identifiers into logs or support tickets.

For emergency revocation, block the application account using the existing audited admin operation. This overrides active Stripe state immediately. Also pause or cancel the Stripe subscription and verify synchronization. If webhook integrity is uncertain, remove application Stripe configuration to disable Checkout/Portal and block affected accounts until repaired.

Never manually set `subscriptions.status = 'active'`; manual state is not trusted payment evidence.

## Rollback and disable strategy

Removing Stripe configuration disables new Checkout and Portal sessions without granting access. The entitlement helper continues to fail closed at the paid-period boundary. After production events exist, do not roll migration 007 back without a reviewed data migration. Disable entry points, preserve the event ledger, and correct forward.
