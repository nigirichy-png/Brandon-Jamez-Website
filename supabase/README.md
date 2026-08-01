# Local Supabase preparation

All four migrations in this directory were reviewed, passed linked-project dry runs, and were applied to the dedicated Brandon Jamez Website Supabase project after explicit approvals. Do not assume future migrations are approved.

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

Local `config.toml` sets the localhost site URL, confirmation redirect, email confirmation, and password policy for a future local Docker stack. It was not pushed wholesale to hosted Auth because `config push` would also update unrelated hosted defaults. The hosted project can retain Supabase's unchanged `ConfirmationURL` template for local development; configure its URL settings manually as documented in the root README. A custom token-hash template, custom SMTP, verified domain, and production URL configuration remain launch requirements.

## Administrative operations schema

`202608010002_admin_management_and_audit.sql` adds the append-oriented `audit_events` table, safe indexes, restrictive RLS and grants, active-admin validation, self display-name updates, role assignment/removal, and account block/restore functions. Audit rows contain allowlisted action/result values and minimal labels; they exclude emails, private reasons, provider references, raw errors, and secrets. Actor and target references use `ON DELETE SET NULL` to preserve history.

`202608010003_require_audited_profile_updates.sql` revokes the earlier direct authenticated display-name update grant. The existing own-row policy remains defense in depth, while successful writes must pass through the audited function.

`202608010004_grant_admin_read_columns.sql` grants the trusted `service_role`
only the profile, role, restriction, verification, and subscription columns
used by the server-rendered admin summaries. RLS bypass alone does not provide
SQL table privileges. Sensitive reason and provider-reference columns remain
ungranted, and browser roles receive no additional access.

Content and moderation tables remain future work. Define ownership, lifecycle, evidence handling, and retention before adding them. Development preview selectors never authorize database access and are ignored in production.
