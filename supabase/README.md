# Local Supabase preparation

Nothing in this directory has been applied to a local or remote database. The migration is a review artifact for a future Supabase integration.

## Review workflow

Before any application:

1. Select and create a Supabase project intentionally outside this task.
2. Review the SQL with the real authentication, privacy, payment, and age-verification workflows.
3. Test it first against a disposable local Supabase environment.
4. Generate database types with the Supabase CLI and replace `src/lib/supabase/types.ts`.
5. Test grants, every RLS policy, negative authorization cases, triggers, and webhook idempotency.
6. Apply to a controlled non-production environment before production.

## Security model

RLS is required because browser requests can reach the Supabase Data API with the public key. Grants decide which database objects a role can reach; RLS decides which rows that role may access. Both layers must remain restrictive.

The initial migration allows an authenticated user to read only their own basic profile, assigned roles, blocked state, age-verification result, and subscription state. Column grants prevent staff-only restriction reasons and provider references from being selected through normal authenticated clients. Users can update only their own `display_name`.

There are deliberately no authenticated write grants or policies for roles, account restrictions, verification results, or subscription state. Role assignment and account-blocking changes require a future trusted administrative workflow. Payment and age-verification status must be updated only after signed server-to-server webhooks are verified. The browser must never report its own successful payment or verification.

The service-role key bypasses RLS. It must remain server-only and be used sparingly for narrow, audited tasks. A service-role client must never be passed to a browser, used in a Client Component, or treated as a convenient substitute for correct RLS policies.

The non-exposed `private.has_role` helper reads trusted `user_roles` for the current `auth.uid()`. It does not trust editable `raw_user_meta_data`. It is prepared for later reviewed policies but is not used to claim that staff workflows are complete.

## Internal operations schema status

The development moderator, content, admin, and audit interfaces do not add or use database tables. No second migration was created because content ownership, record lifecycle, moderation retention and evidence rules, audit actor semantics, and trusted-write procedures are not yet mature enough for a durable schema.

Future proposals may cover `content_items`, `events`, `moderation_cases`, and `audit_events`. Before SQL is added, define operation-level permission rules and retention requirements. New tables must enable RLS immediately, expose no moderation records publicly, give normal authenticated browser users no privileged writes, and reserve audit insertion for narrow trusted server operations. Any privileged function must use a fixed `search_path`. Nothing in the mock staff selector or disabled browser controls may become a database authorization source.
