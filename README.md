# Brandon Jamez Website

A polished foundation for the Brandon Jamez platform. It combines public previews, real Supabase authentication, server-authorized account administration, append-oriented audit events, and development-only mock entitlement and staff experiences.

Supabase Auth, the RLS-protected account schema, display-name self-service, role management, account restrictions, and administrative audit records are connected. Professional age verification, payments, subscriptions, private streaming, content mutations, and external moderation remain unconnected.

## Technology

- Next.js 16 with App Router
- React 19 and TypeScript
- Tailwind CSS 4
- ESLint 9 with the Next.js configuration
- npm
- `@supabase/supabase-js` and `@supabase/ssr`
- Project-local Supabase CLI, invoked through `npx supabase`
- `src` directory and `@/*` import alias

## Routes

| Route | Status | Purpose |
| --- | --- | --- |
| `/` | Public mock UI | Homepage, live status, social placeholders, featured videos, events, Guide, and membership promotions |
| `/guide` | Public placeholder | Explains the separate Pattaya Guide project and holds a disabled URL placeholder |
| `/videos` | Public mock UI | Public video metadata and abstract placeholders only |
| `/events` | Public mock UI | Upcoming mock events |
| `/subscribe` | Public information | Future subscriber requirements; subscriptions are not active |
| `/login` | Public authentication | Server Action email/password sign-in with safe same-origin continuation |
| `/signup` | Public authentication | Validated account creation with email confirmation |
| `/forgot-password` | Public authentication | Enumeration-resistant password-reset request |
| `/auth/confirm` | Route Handler | Token-hash, authorization-code, existing-cookie, and hosted confirmation routing |
| `/auth/complete` | Public authentication | Safe completion for the unchanged hosted ConfirmationURL fragment flow |
| `/auth/recovery` | Route Handler | Recovery token-hash, PKCE code, and hosted-fragment routing |
| `/auth/recovery/complete` | Public authentication | SDK-owned completion for hosted implicit recovery fragments |
| `/reset-password` | Recovery-session only | Password replacement after a validated recovery callback |
| `/auth/error` | Public status | Generic confirmation failure guidance without token details |
| `/account` | Authenticated | Account summary, audited display-name editing, authorized-area links, and sign-out |
| `/account/security` | Authenticated | Current-password change and confirmed email-change request |
| `/verify-age` | Public development plan | Future professional age-verification boundary; no collection or verification |
| `/member` | Server-authorized | Real RLS state by default; explicit mock scenarios with allowlisted `?demo=` |
| `/member/videos/[videoId]` | Server-authorized | Repeats identity, entitlement, and video-record checks |
| `/mod` | Server-rendered development demo | Moderation operations overview |
| `/mod/review` | Server-rendered development demo | Fictional internal review queue with disabled actions |
| `/content` | Server-rendered development demo | Content-operations overview |
| `/content/videos` | Server-rendered development demo | Public and subscriber video-metadata workflow |
| `/content/events` | Server-rendered development demo | Event publication workflow |
| `/admin` | Admin-only | Real administrative control-center overview; local previews in development only |
| `/admin/users` | Admin-only | Paginated, data-minimized real account summaries |
| `/admin/users/[userId]` | Admin-only | Account detail, confirmed role/restriction actions, and recent audit activity |
| `/admin/content` | Server-rendered development demo | High-level content oversight |
| `/admin/audit` | Admin-only | Paginated real audit-event stream; fictional records only in development preview |

## Local development

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Quality commands:

```powershell
npm run lint
npm run build
git diff --check
git status
```

## Folder structure

```text
src/
  app/                    Route pages and global styles
  components/
    home/                 Homepage-specific sections
    internal/             Shared staff shell, access gates, navigation, and operation UI
    layout/               Shared header and footer
    protected/            Honest unprotected-placeholder presentation
    ui/                   Reusable cards, headings, buttons, and branding
  data/                   Development-only mock content
  lib/
    auth/                 Server-only session validation helpers
    permissions/          Preliminary pure TypeScript UI logic
    staff/                Server-only mock staff scenarios and authorization decisions
    supabase/             Lazy browser, server, Proxy, and admin clients
  types/                  Shared roles, access state, and content types
docs/
  ARCHITECTURE.md         Future integration and security design
supabase/
  migrations/             Local SQL review artifacts; never auto-applied
  README.md               Migration and RLS review requirements
```

## Mock-data status

Everything in `src/data/mock-data.ts` is development-only. Public video records are display metadata and do not include MP4 URLs. Subscriber video records are metadata only and include no files, filesystem paths, playback URLs, real provider asset IDs, credentials, or tokens. Their `mockPlaybackAssetId` fields are deliberately fake internal identifiers. Social destinations and live streaming are not configured.

## Member access demo

Without a valid preview parameter, member routes require a validated Supabase user and load restriction, age-verification, subscription, and role state through RLS-protected queries. Guests redirect to `/login`; missing rows and query failures never grant access.

In `npm run dev`, the routes retain six explicitly allowlisted development states: `guest`, `signed_in_unverified`, `age_verified_no_subscription`, `active_subscriber`, `blocked_subscriber`, and `expired_subscriber`. Production ignores every `demo` value and never renders the selector.

This is a UI and architecture demonstration, not a shortcut around future security:

- Scenario selection is parsed only in Server Components and is not stored in cookies, local storage, a database, or a session.
- No scenario creates a Supabase user or invokes authentication, age verification, payments, or streaming.
- Server-only helpers evaluate authentication, blocking, verification, and subscription in a conservative order.
- Each mock video detail request validates its record and repeats the entitlement decision.
- An allowed request receives an in-memory fake playback reference with a five-minute expiry. It is neither a URL nor a JWT and cannot play media.
- Guest and gated member views do not render the subscriber library metadata.

Real access uses validated server-side session and database state. A future video integration must still re-evaluate entitlement immediately before requesting a short-lived signed playback URL or token from a reviewed streaming provider.

## Internal operations demo

Internal routes validate the Supabase user and query trusted database roles and account restrictions through RLS. Guests redirect to login; no role row means no staff permission. In `npm run dev` only, `?staffDemo=` retains explicit UI previews. Production ignores the parameter and omits preview controls from rendered HTML.

Direct preview links:

- Moderator: `/mod?staffDemo=moderator`
- Content manager: `/content?staffDemo=content_manager`
- Administrator: `/admin?staffDemo=admin`

Each Page independently repeats the appropriate authorization check. Moderator routes require `moderator` or `admin`; content routes require `content_manager` or `admin`; admin routes require `admin`. All require an authenticated, unblocked account. Subscriber entitlement remains separate: a subscriber is not staff, and staff roles are not automatically paid subscribers.

The records in `src/data/internal-operations.ts` are safe, fictional, server-only development data. Moderation and content previews never contact an external platform. Real admin user and audit pages use server-authorized Supabase reads; mock user and audit records appear only in explicit development preview mode.

The explicit preview states remain demonstrations and never read or mutate real staff data. Administrative Server Actions repeat identity, unblocked-admin, target, input, and resulting-state checks. Atomic database functions derive the actor from `auth.uid()`, protect the last active administrator, and append data-minimized audit events. Browser input and navigation visibility are never authorization.

Missing or obvious placeholder Supabase values still select safe unconfigured operation. Public pages remain static, auth forms disable themselves, and `getCurrentUser()` returns `null` without creating a client. This allows a configuration-cleared build while the connected local environment uses `.env.local`.

## Authentication setup

`.env.local` is Git-ignored. Real admin enumeration requires a server-only `SUPABASE_SECRET_KEY` (preferred) or legacy `SUPABASE_SERVICE_ROLE_KEY`; neither may use a `NEXT_PUBLIC_` prefix.

The hosted project must be configured manually in Supabase Dashboard:

1. Authentication → URL Configuration → Site URL: `http://localhost:3000`
2. Authentication → URL Configuration → Redirect URLs: `http://localhost:3000/auth/confirm`
3. Authentication → Providers → Email: keep email/password signup and confirmation enabled

The unchanged Supabase `ConfirmationURL` template is supported for local development. Its hosted verification endpoint redirects to `/auth/confirm` with an implicit session fragment. The server cannot access fragments, so `/auth/confirm` forwards that case to `/auth/complete`; the official Supabase Auth client consumes and clears the fragment, validates the user with Supabase, and stores the SSR session in cookies rather than localStorage. The application does not parse, render, or log fragment values. If confirmation completed but a usable local session cannot be established, the page gives a neutral sign-in link.

`/auth/confirm` also retains the future custom-template flow using `token_hash` plus an allowlisted email OTP type, supports an official PKCE authorization `code` exchange, and accepts an already valid cookie-backed user. Every successful path ends at `/account`; invalid parameters and provider failures lead only to generic application pages. Callback destinations are fixed same-origin paths and never taken from an untrusted URL.

Add `http://localhost:3000/auth/recovery` to the hosted redirect allowlist alongside `/auth/confirm`. Password-reset requests always return the same message, whether or not an account exists. `/auth/recovery` accepts only a recovery `token_hash`, an official PKCE code, or the hosted implicit-fragment handoff. Server callbacks establish a short-lived signed, HttpOnly recovery marker before `/reset-password` can update the password. The unchanged hosted implicit flow is completed by the official Auth SDK on `/auth/recovery/complete`; application code never parses or renders its fragment. Successful recovery and authenticated password changes invalidate all sessions and return to sign-in. Email changes keep Supabase double confirmation enabled and append an email-free audit event through an authenticated, no-argument database function.

If `/auth/recovery` is absent from the hosted allowlist, Supabase may fall back to the Site URL and the implicit recovery fragment cannot be recovered by a server after that navigation. Default Supabase email delivery is best-effort and rate limited, so local delivery tests remain constrained until custom SMTP is configured.

The project-local `supabase/config.toml` mirrors these local expectations but has not been pushed wholesale to the hosted project because doing so would also overwrite unrelated hosted Auth defaults.

## Security boundaries

Protected Pages validate a current Supabase user and load access state on the server. Navigation visibility and Proxy refresh remain non-authoritative; every Page repeats its own checks and RLS independently constrains account rows. The development helpers in `src/lib/entitlements` and `src/lib/staff` accept deliberately selectable mock state and must never be treated as real authorization.

The Next.js 16 `src/proxy.ts` file refreshes cookie-backed sessions when configured and returns a normal response when unconfigured. It does not redirect, query roles, or protect pages. Proxy refresh is not authorization: protected Pages validate identity and repeat authorization and entitlement checks on the server, while RLS independently protects account rows. Future Route Handlers and Server Actions for privileged mutations must repeat the same checks.

Before production launch, authentication additionally requires:

- A custom SMTP provider; Resend is the likely future provider but is not integrated now
- A verified sending domain
- The production Site URL and exact production redirect URLs
- An editable confirmation template using `token_hash` for the server-side confirmation route
- Email deliverability testing
- Supabase Auth rate-limit review
- Password-reset email configuration and end-to-end testing
- Email-change template review and end-to-end testing

Production security must also include:

- Supabase Auth or another reviewed authentication system with validated server-side sessions
- Server-side authorization on every protected request
- PostgreSQL access protected by Supabase Row Level Security
- A role model covering `visitor`, `subscriber`, `moderator`, `content_manager`, and `admin`
- Server-side account-blocking checks before access and playback
- Verified signed webhooks for payments, age verification, and relevant provider updates
- Short-lived signed authorization for subscriber video playback

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the planned flows.

## Environment variables and secrets

Copy `.env.example` to the Git-ignored `.env.local` only when an integration is intentionally started. The example contains obvious placeholders and is safe to track.

- `.env.local` and other real environment files remain ignored by Git.
- Variables prefixed with `NEXT_PUBLIC_` are visible in browser code and must never contain secrets.
- Supabase secret/service-role keys, provider API tokens, and webhook secrets are server-only.
- `SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` bypass RLS. They are isolated behind a lazy `server-only` module and used for narrowly scoped admin directory reads only after normal session authorization succeeds.
- Real secrets belong in `.env.local` for local development or encrypted deployment environment settings.
- Never commit real credentials or generated secrets.

## Integration and deployment direction

Supabase Auth and the first four reviewed migrations are applied to the dedicated Brandon Jamez Website project. Confirmation supports hosted, token-hash, and authorization-code flows. Server Actions implement signup, login, logout, account security, display-name updates, role changes, and restrictions. The account-security audit migration remains local until explicitly approved. CLI-generated database types live in `src/lib/supabase/database.types.ts`.

Professional external providers will be selected later for age verification, payments, and private streaming. None has been chosen or integrated.

Vercel is the initial likely hosting target. Cloudflare may be evaluated later for hosting or video capabilities. Deployment must not begin until environment, security, privacy, and legal requirements have been reviewed.

## Project separation

This is a new, standalone project. It does not import, copy, move, or alter the existing Brandon Jamez Pattaya Guide or any other local project.

**The Nigirichy Stream Recorder must remain local. It must never be exposed to the public internet or made remotely controllable through this website.** No integration point for it exists here and none should be added.
