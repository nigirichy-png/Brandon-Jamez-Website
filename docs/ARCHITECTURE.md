# Future integration architecture

This document describes the connected authentication and administration foundation and remaining integration direction. Supabase Auth, account administration, and audit events are connected; content and entitlement-provider workflows remain mock or planned.

## Implemented authentication flow

Signup and login use validated Next.js Server Actions and the request-scoped `@supabase/ssr` client. Signup grants no role, verification, or subscription. `/auth/confirm` supports an allowlisted `EmailOtpType` with `token_hash`, an official PKCE authorization-code exchange, and an already valid cookie-backed user. The unchanged hosted `ConfirmationURL` flow returns an implicit fragment that a server cannot read, so the missing-query case moves to `/auth/complete`. There, the official Supabase Auth client consumes and clears the fragment, validates the user remotely, and writes only the normal SSR session to cookies through a dedicated cookie storage adapter. Application code never parses or renders callback values, and localStorage is not used. Failures are generic. Login accepts only a same-origin relative continuation path. Logout is a Server Action.

Password-reset requests normalize email on the server and always return an enumeration-resistant response. Supabase sends recovery to the fixed `/auth/recovery` callback. Token-hash and PKCE callbacks are verified by Supabase server-side, then a ten-minute signed HttpOnly marker binds `/reset-password` to that validated user. The unchanged hosted implicit flow must be consumed by the official browser SDK because fragments never reach the server; it listens for `PASSWORD_RECOVERY`, clears the fragment without application parsing, updates only after that event, and stores session state in cookies rather than localStorage. A successful reset globally signs out sessions.

`/account/security` is authenticated and fails closed when trusted account state cannot load or the account is blocked. Password changes require the current password through Supabase Auth, enforce the same 12–128 character policy as signup, and globally sign out sessions on success. Email changes use Supabase double-confirm behavior and do not treat the proposed address as trusted. After Auth accepts a request, a no-argument authenticated RPC derives `auth.uid()` and appends `account.email_change_requested` without any email metadata. The Auth operation and audit insert cross system boundaries and cannot be one PostgreSQL transaction; if the audit cannot be confirmed, the UI reports a generic operational failure rather than claiming a fully recorded success.

## Future OAuth preparation

Google and Discord remain disconnected. A later integration should use Supabase Auth identities and the same fixed callback/redirect validation rather than adding a speculative public provider table. Existing email/password users should link a provider only from a recently authenticated account session, with an explicit confirmation step, provider-account collision handling, and recovery guidance; signing in separately must not silently merge accounts solely because metadata contains a matching email.

Provider identity and display metadata remain separate from authorization. Google identity grants no role. Discord identity, username, guild membership, and guild roles grant no `moderator`, `content_manager`, `admin`, subscription, or age-verification state. If guild membership or role synchronization is added later, a trusted server must query Discord with reviewed credentials, validate guild and role identifiers, handle revocation and stale state, and write data-minimized audit events. `public.user_roles` remains the sole trusted application-role source.

`loadRealAccountState()` first validates the current user through Supabase Auth and then queries only the user's RLS-visible profile, roles, restriction, age-verification, and subscription records. Missing rows produce inactive state. Any database error clears roles and fails closed by treating access as unavailable. Provider references, restriction reasons, metadata dumps, and tokens are never returned to account UI.

Every production member and internal Page uses real state and redirects unauthenticated requests to login. Preview parameters are interpreted only when `NODE_ENV === "development"`; production ignores them and does not render selectors.

## Development member simulation

`/member` and `/member/videos/[videoId]` now demonstrate server-rendered access states without creating identity or entitlement. An allowlisted `?demo=` value selects one of six typed in-memory scenarios. Unknown, missing, or repeated query values resolve to `guest`; the selection is never written to cookies, browser storage, Supabase, or another persistence layer.

The modules in `src/lib/entitlements` are marked server-only where they interpret scenario state or make access decisions. They evaluate authentication first, then account blocking, professional age-verification status, subscription expiry or absence, and finally access. The dynamic video route validates the requested mock record and repeats that evaluation before producing a request-time fake playback decision. Its reference is an obviously fake non-URL value, expires after five minutes, has no cryptographic or provider meaning, and is not exposed as a playable browser credential.

Query parameters remain visitor-controlled development previews and are never trusted as real state. Normal requests derive identity and statuses from validated server-side sources. The fake playback decision still requires replacement with a narrow provider integration that issues real short-lived playback authorization only after all checks pass.

## Development staff simulation

The moderator, content-manager, and admin routes use a separate allowlisted `?staffDemo=` query parameter. It is parsed in Server Components, never persisted, and deliberately independent from the subscriber `?demo=` parameter. The seven scenarios model guest, subscriber-only, authorized staff, admin, and blocked staff states without creating users, sessions, cookies, or database records.

Every internal Page calls its own server-only evaluator before rendering operations records. The shared shell and hidden navigation are organizational UI only and are never treated as authorization. Evaluation order is authenticated identity, unblocked account, required trusted role, then allowed. Moderator routes accept moderator or admin; content routes accept content manager or admin; admin routes accept only admin. An admin is not automatically modeled as age-verified or subscribed, and a subscriber has no staff permission.

The architecture maintains seven distinct boundaries:

1. Authentication validates the Supabase user and server-side session.
2. Staff authorization loads trusted roles from protected database rows.
3. Subscriber entitlement separately evaluates restrictions, age verification, and subscription state.
4. Content-management permission authorizes a narrow operation, not merely a page.
5. Administrative permission independently authorizes privileged account and configuration work.
6. PostgreSQL grants and RLS constrain data even when application checks fail.
7. Trusted server code writes an append-oriented audit event for privileged changes.

Server Actions repeat identity, restriction, role, target, input, and post-mutation checks. The service-secret client is lazy, server-only, and used for narrow Auth-directory reads after normal session authorization. Authenticated RPC functions derive `auth.uid()`, use a fixed empty search path, and make role/restriction changes plus audit insertion atomic.

## Administrative operations

`/admin/users` paginates Auth users at a conservative page size, combines only safe profile, role, restriction, verification, and subscription fields, and masks email addresses. `/admin/users/[userId]` validates the route identifier after admin authorization, re-reads the target, and offers deliberate confirmation forms. Identifiers are used only in same-origin internal links and trusted lookups, never visible labels or logs.

Role assignment is idempotent. Exact role removal and account blocking share a transaction advisory lock and reject any change that would leave no active, unblocked administrator. A subscriber role never creates subscription entitlement. Blocking is application-level, retains Auth credentials, stores a private validated reason, and never reveals that reason to the account holder or audit UI. Restoration clears the restriction timestamp, actor, and reason.

`audit_events` is append-oriented: browser roles have no insert, update, or delete grant; authenticated active admins receive a restricted read policy; narrowly scoped functions write allowlisted successful actions. Events exclude emails, restriction reasons, tokens, raw errors, provider payloads, and entitlement references. User deletion nulls actor or target identifiers rather than cascade-deleting history.

Display-name self-service uses the cookie-backed authenticated client and `update_own_display_name`. Identity comes only from `auth.uid()`, input is trimmed and constrained, and the operation updates only the caller's profile before appending an audit event.

### Internal workflow boundaries

The moderation preview processes only safe fictional records already submitted to this website's internal workflow. It performs no reports, bans, mass actions, account actions, or API calls against YouTube, Facebook, Discord, Instagram, or any other external service.

The content preview reads existing mock video and event metadata. It cannot upload, schedule, publish, archive, or mutate records. Future writes must validate content-manager or admin permission on the server, constrain rows with RLS, and emit an audit event.

The admin preview shows data-minimized fictional account summaries and safe integration labels only. It exposes no environment variables, secret names, credentials, contact data, identity-document data, payment data, IP addresses, or precise locations. Role and blocking controls are disabled demonstrations; browser-side role mutation is never security.

Future audit events must be server-written, append-oriented, protected from direct browser insertion, limited to non-sensitive metadata, and readable only through trusted staff authorization plus RLS. They should cover role changes, restrictions, publication changes, moderation escalations, and configuration reviews.

## Application modes

- `mock` is the default when public Supabase configuration is missing or still uses placeholders. Public static generation does not initialize a client or contact Supabase.
- `supabase` is selected only when a valid HTTPS project URL and non-placeholder public anon key are present. This means configuration exists; it does not mean authorization is complete.

The mode is an infrastructure signal, never an authenticated-user signal. The UI must not manufacture a signed-in user in mock mode.

## Supabase client boundaries

The project uses only the official `@supabase/supabase-js` and `@supabase/ssr` packages.

- `browser.ts` is a Client Component boundary. It lazily creates a client with the public URL and anon key only. RLS must constrain every database request it can make.
- `server.ts` creates a new cookie-backed client per request using the async Next.js `cookies()` API. It uses the public anon key and the requesting user's session, not the service-role key.
- `proxy.ts` synchronizes refreshed auth cookies through the official `getAll`/`setAll` pattern. It calls `getClaims()` only when configured and performs no role query or redirect.
- `admin.ts` is guarded by `server-only`, initializes only when explicitly called, and rejects missing or placeholder secret/service-role configuration. Because this client bypasses RLS, it is reserved for reviewed, narrowly scoped server reads and future verified webhooks.

No client is created during module import. Configuration errors occur only when a dependent function is intentionally invoked.

## Authenticated request flow

1. Signup confirmation establishes a cookie-backed session through the hosted fragment completion, a token-hash verification, a PKCE code exchange, or an already valid cookie session.
2. Proxy refreshes or synchronizes cookies; it does not grant access.
3. A protected Page, Route Handler, or Server Function validates identity on the server with `getClaims()` or `getUser()` as appropriate.
4. Server authorization checks trusted roles and account restrictions.
5. Entitlement checks age-verification and subscription state.
6. Database queries remain constrained by RLS for the authenticated user.
7. Sensitive Route Handlers and signed-video endpoints repeat every relevant authorization and entitlement check.

Authenticated routes must not use ISR or shared caching for responses that set or depend on auth cookies.

## Authorization model

The preliminary roles are `visitor`, `subscriber`, `moderator`, `content_manager`, and `admin`. A future account may have multiple roles. Account blocking overrides role-based access.

All protected operations must use a validated server-side session and server-side authorization. Supabase Row Level Security must independently restrict database access. Frontend state, hidden navigation, route names, and the pure helpers in `src/lib/permissions/access.ts` are not security enforcement.

The four layers stay distinct:

1. Authentication establishes who the user is.
2. Authorization determines which trusted roles and operations apply.
3. Entitlement combines account-blocking, professional age verification, and subscription state for member media.
4. Database enforcement uses grants and RLS to constrain rows independently of application rendering.

Proxy cookie refresh, hidden navigation, and Client Component checks are not authorization. Page-level server checks are required, Route Handlers and Server Functions must repeat them, and signed-playback endpoints must re-evaluate entitlement immediately before issuing temporary authorization.

## Subscriber video access

The intended playback flow is:

1. The user signs in securely.
2. The server validates the session.
3. The server checks whether the account is blocked.
4. The server checks age-verification status.
5. The server checks subscription status.
6. The user requests playback.
7. The server repeats every entitlement check.
8. The server requests or generates a short-lived signed playback URL or token.
9. The browser receives only temporary playback authorization.
10. A professional streaming provider delivers the stream.

Private subscriber video must never use permanent public MP4 URLs, local filesystem paths, hidden frontend buttons as access control, secrets in browser code, or permanent unsigned playback links. Possible providers include Cloudflare Stream, Mux, or another professional service; no provider is selected or connected yet.

## Professional age verification

A professional external provider will be selected later. The architecture must support document verification or eID, liveness checks, data-minimizing result handling, and signed server-to-server webhook callbacks.

The application should ideally retain only:

- `age_verified`
- `verification_reference`
- `verified_at`
- Provider status when operationally necessary

The application must not be designed to retain ID-card photographs, passport photographs, selfie photographs, liveness recordings, complete identity-document data, or document numbers. A checkbox is not real age verification and must not be represented as such.

## Payments and subscription state

A professional external payment provider will be selected later. Subscription state must change only in response to verified, signed, server-to-server webhook events and reviewed administrative recovery procedures.

There is no checkout, card form, payment handling, fake successful purchase, or provider credential in this MVP.

## Supabase, PostgreSQL, and local migrations

Supabase Auth establishes user identity while server-side code validates sessions. PostgreSQL stores the minimum required account, role, entitlement, and integration-reference data. Row Level Security policies enforce least-privilege access independently of application UI.

`supabase/migrations` contains the five applied migrations: the initial account model, admin/audit operations, audited-profile hardening, narrow trusted read grants, and the account-security audit action. The administration migration adds `audit_events`, restrictive grants and RLS, an active-admin helper, an authenticated display-name function, and atomic role/restriction functions with final-admin protection. The server secret receives only the account-summary columns required after real-admin validation. Content and moderation tables remain planned pending ownership, lifecycle, evidence, and retention review.

`src/lib/supabase/database.types.ts` is generated from the linked project. `types.ts` remains a stable re-export boundary for existing imports.

Service-role credentials must remain server-only. Webhooks must verify signatures before changing account state. Provider callbacks must be idempotent and auditable.

## Production deployment boundary

Vercel hosts the production Next.js application. Production receives the public site URL, public Supabase URL and anon key, and a server-only Supabase secret. Preview receives no server secret and must fail closed for trusted administrative directory reads. Public variables may be bundled for browsers; the secret may be read only by the lazy `server-only` admin client after normal authenticated admin authorization.

Supabase owns authentication and the database. Its production Site URL points to the canonical Vercel origin, with exact production and localhost allowlist entries for `/auth/confirm` and `/auth/recovery`. The application validates continuation paths independently and never trusts an arbitrary callback destination.

Deployments currently use the authenticated Vercel CLI because GitHub integration lacks repository access. This prevents automatic Git-triggered deployments but does not weaken runtime authorization. A future integration must grant only the required repository access and must not broaden Production secret scope to Preview.

## Operational isolation

This public website remains independent from every existing local project. In particular, the Nigirichy Stream Recorder must stay local and must never be exposed publicly or made remotely controllable from this website.
