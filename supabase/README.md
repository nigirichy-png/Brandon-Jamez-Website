# Local Supabase preparation

The first six migrations were reviewed, tested, and applied to the dedicated Brandon Jamez Website Supabase project after explicit approvals. Migrations 007-012 are local and unapplied. Do not assume any unapplied migration is approved.

## Review workflow

Before any application:

1. Select and create a Supabase project intentionally outside this task.
2. Review the SQL with the real authentication, privacy, payment, and age-verification workflows.
3. Test it first against a disposable local Supabase environment when Docker is available.
4. Regenerate `src/lib/supabase/database.types.ts` with `npx supabase gen types typescript --linked` after an approved schema change.
5. Test grants, every RLS policy, negative authorization cases, triggers, and webhook idempotency.
6. Apply to a controlled non-production environment before production.

## Security model

RLS is required because browser requests can reach the Supabase Data API with the public key. Grants decide which database objects a role can reach; RLS decides which rows that role may access. Both layers must remain restrictive.

The initial migration allows an authenticated user to read only their own basic profile, assigned roles, blocked state, age-verification result, and subscription state. Column grants prevent staff-only restriction reasons and provider references from being selected through normal authenticated clients. The second migration routes display-name changes through a narrow `auth.uid()`-bound function that also appends an audit event.

There are no direct authenticated write grants or policies for roles, account restrictions, verification results, subscriptions, or audit events. Allowlisted role and restriction mutations use active-admin-only `SECURITY DEFINER` functions with a fixed empty search path, no dynamic SQL, actor identity from `auth.uid()`, atomic audit writes, and transaction-safe final-admin protection. Payment and age-verification status remain unchanged and must eventually use verified server-to-server webhooks.

The modern Supabase secret key and legacy service-role key bypass RLS. Either must remain server-only and be used sparingly for narrow, authorized reads or verified server jobs. The admin client must never be passed to a browser, used in a Client Component, or treated as a substitute for RLS and repeated authorization.

The non-exposed `private.has_role` helper reads trusted `user_roles` for the current `auth.uid()`. It does not trust editable `raw_user_meta_data`. It is prepared for later reviewed policies but is not used to claim that staff workflows are complete.

## Applied foundation

Remote catalog verification confirmed `profiles`, `user_roles`, `account_restrictions`, `age_verifications`, and `subscriptions` with RLS enabled, plus the six expected self-read/basic-profile policies. No table contents were inspected and no role was assigned.

Local `config.toml` sets the localhost site URL, exact confirmation and recovery redirects, email confirmation, tracked token-hash templates, security notifications, and password policy for a future local Docker stack. It was not pushed wholesale to hosted Auth because `config push` would also update unrelated hosted defaults. Configure hosted URL and template settings manually as documented in the root README. Resend delivery, a verified domain, hosted-template installation, and production URL configuration remain launch requirements.

## Administrative operations schema

`202608010002_admin_management_and_audit.sql` adds the append-oriented `audit_events` table, safe indexes, restrictive RLS and grants, active-admin validation, self display-name updates, role assignment/removal, and account block/restore functions. Audit rows contain allowlisted action/result values and minimal labels; they exclude emails, private reasons, provider references, raw errors, and secrets. Actor and target references use `ON DELETE SET NULL` to preserve history.

`202608010003_require_audited_profile_updates.sql` revokes the earlier direct authenticated display-name update grant. The existing own-row policy remains defense in depth, while successful writes must pass through the audited function.

`202608010004_grant_admin_read_columns.sql` grants the trusted `service_role`
only the profile, role, restriction, verification, and subscription columns
used by the server-rendered admin summaries. RLS bypass alone does not provide
SQL table privileges. Sensitive reason and provider-reference columns remain
ungranted, and browser roles receive no additional access.

The applied videos-only CMS stores validated YouTube, Rumble, and Kick HTTPS link metadata; active admins mutate it through audited RPCs, and public callers read published rows through a safe RPC. Local migrations extend that foundation with subscriber media, moderation, and events. Development preview selectors never authorize database access and are ignored in production.

`202608010006_cms_videos_foundation.sql` is applied. It adds `cms_videos`, the two CMS enums, a published-only public list function, active-admin mutation/list functions, optimistic-version checks, a single-featured invariant, restrictive RLS/grants, and data-minimized CMS audit actions. It adds no media table, Storage configuration, upload path, provider credential, or direct browser table mutation grant.

`202608010005_account_security_audit_action.sql` is applied. It adds only the allowlisted `account.email_change_requested` action and a no-argument, authenticated function that derives its actor from `auth.uid()`. It stores no old or new email, accepts no identifier, and changes no Auth, role, restriction, verification, subscription, or profile state.

`202608010007_trusted_stripe_subscriptions.sql` is locally tested and unapplied. It invalidates every pre-webhook subscription row, extends Stripe state and constraints, adds the fail-closed paid-entitlement helper, a data-minimized idempotency ledger, caller-bound Checkout/Portal RPCs, and one service-role-only webhook synchronization RPC. It does not activate billing and must not be applied remotely without the phased approval in `docs/STRIPE_SUBSCRIPTIONS.md`.

`202608010008_subscriber_content.sql`, `202608010009_subscriber_media_storage.sql`, and `202608060010_private_subscriber_video.sql` are locally prepared and unapplied. Together they add an active-admin subscriber-post CMS, paid-subscriber read RPCs, the private `subscriber-media` bucket, validated post-bound image/video paths, and small MP4/WebM uploads up to 10 MB. Browser roles receive no direct Storage read policy. The application reauthorizes each same-origin media request before creating a 60-second signed URL server-side and proxying it with no-store headers. Apply these only in order, after migration 007, in a controlled environment with negative authorization and range-playback tests.

`202608070014_bunny_stream_vod.sql` adds a separate private provider-reference table for large Bunny Stream subscriber VOD. It does not alter the Supabase Storage bucket. Active admins can attach/remove one opaque Bunny UUID per post through audited RPCs; only `service_role` may apply signed-webhook status updates or resolve a ready UUID after the application has authorized playback. Subscriber DTOs expose only `has_bunny_video`. The migration remains local until explicitly reviewed and applied after 013.

`202608070011_moderation_workflow.sql` is locally prepared and unapplied. It adds website-internal moderation cases, append-only status transitions, active-moderator-or-admin list and mutation RPCs, self-assignment ownership rules, optimistic version checks, archived-case-only administrative deletion, restrictive grants/RLS, and data-minimized audit actions. It does not contact or moderate any external platform. Apply it only after the earlier migrations because it extends the current audit constraints.

`202608070012_content_operations_and_events.sql` is locally prepared and unapplied. It gives active moderators read-only backend visibility into video and event records, gives active content managers and administrators audited/versioned mutations, adds a small event CMS, and exposes only published events publicly. Subscriber and anonymous callers have no backend access. Apply it only after migration 011 because it extends the audit constraints again.

## Hosted authentication URLs

After domain registration and verification, the hosted Supabase project must use `https://brandonjamezofficial.com` as its production Site URL and allow the exact production and required localhost URLs for `/auth/confirm` and `/auth/recovery`. Those production dashboard changes have not been made. Maintain them deliberately rather than pushing the complete local `config.toml`, which could overwrite unrelated hosted Auth defaults. The tracked token-hash templates are ready; Resend connection, verification of `auth.brandonjamezofficial.com`, hosted-template installation, and deliverability tests remain external production email work.
