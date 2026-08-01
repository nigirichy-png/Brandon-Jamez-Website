# Brandon Jamez Website

A polished frontend foundation for the future public Brandon Jamez platform. This repository is an intentionally safe MVP: it presents branding, public content previews, events, the Pattaya Guide handoff, and transparent development placeholders for future account areas.

No real authentication, age verification, subscription, payment, database, or video-streaming provider is connected.

## Technology

- Next.js 16 with App Router
- React 19 and TypeScript
- Tailwind CSS 4
- ESLint 9 with the Next.js configuration
- npm
- `@supabase/supabase-js` and `@supabase/ssr` (installed but unconfigured)
- `src` directory and `@/*` import alias

## Routes

| Route | Status | Purpose |
| --- | --- | --- |
| `/` | Public mock UI | Homepage, live status, social placeholders, featured videos, events, Guide, and membership promotions |
| `/guide` | Public placeholder | Explains the separate Pattaya Guide project and holds a disabled URL placeholder |
| `/videos` | Public mock UI | Public video metadata and abstract placeholders only |
| `/events` | Public mock UI | Upcoming mock events |
| `/subscribe` | Public information | Future subscriber requirements; subscriptions are not active |
| `/login` | Development placeholder | Disabled sign-in preview plus URL-only member and staff preview links |
| `/verify-age` | Public development plan | Future professional age-verification boundary; no collection or verification |
| `/member` | Server-rendered development demo | Mock subscriber access states selected by an allowlisted `?demo=` value |
| `/member/videos/[videoId]` | Server-rendered development demo | Validated mock video record and repeated entitlement/playback simulation |
| `/mod` | Server-rendered development demo | Moderation operations overview |
| `/mod/review` | Server-rendered development demo | Fictional internal review queue with disabled actions |
| `/content` | Server-rendered development demo | Content-operations overview |
| `/content/videos` | Server-rendered development demo | Public and subscriber video-metadata workflow |
| `/content/events` | Server-rendered development demo | Event publication workflow |
| `/admin` | Server-rendered development demo | Administrative control-center overview |
| `/admin/users` | Server-rendered development demo | Data-minimized fictional user summaries |
| `/admin/content` | Server-rendered development demo | High-level content oversight |
| `/admin/audit` | Server-rendered development demo | Responsive fictional audit-event stream |

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

The member routes simulate six explicitly allowlisted states: `guest`, `signed_in_unverified`, `age_verified_no_subscription`, `active_subscriber`, `blocked_subscriber`, and `expired_subscriber`. Select one with a URL such as `/member?demo=active_subscriber`. Missing, repeated, or unknown values safely resolve to `guest`.

This is a UI and architecture demonstration, not a shortcut around future security:

- Scenario selection is parsed only in Server Components and is not stored in cookies, local storage, a database, or a session.
- No scenario creates a Supabase user or invokes authentication, age verification, payments, or streaming.
- Server-only helpers evaluate authentication, blocking, verification, and subscription in a conservative order.
- Each mock video detail request validates its record and repeats the entitlement decision.
- An allowed request receives an in-memory fake playback reference with a five-minute expiry. It is neither a URL nor a JWT and cannot play media.
- Guest and gated member views do not render the subscriber library metadata.

Production must replace the scenario lookup with validated server-side session and database state. It must also re-evaluate entitlement immediately before requesting a short-lived signed playback URL or token from a reviewed streaming provider.

## Internal operations demo

The internal routes use a separate, server-parsed `?staffDemo=` parameter. Available allowlisted scenarios are `guest`, `subscriber_only`, `moderator`, `content_manager`, `admin`, `blocked_moderator`, and `blocked_admin`. Unknown, missing, or repeated values fall back to `guest` and nothing is stored.

Direct preview links:

- Moderator: `/mod?staffDemo=moderator`
- Content manager: `/content?staffDemo=content_manager`
- Administrator: `/admin?staffDemo=admin`

Each Page independently repeats the appropriate mock authorization check. Moderator routes require `moderator` or `admin`; content routes require `content_manager` or `admin`; admin routes require `admin`. All require the simulated account to be authenticated and unblocked. Subscriber entitlement remains separate: a subscriber is not staff, and staff scenarios are not automatically paid subscribers.

The records in `src/data/internal-operations.ts` are safe, fictional, server-only development data. Moderation is limited to this website's internal fictional workflow and never contacts or claims action against an external platform. Content and administrative controls are disabled, non-persistent previews. Audit records are fictional presentation data, not proof that an operation occurred.

These routes are publicly selectable demonstrations, not production security. Future implementation requires validated Supabase identity, trusted database role lookup, route-level and operation-level server checks, restrictive RLS, narrow service-role writes, and server-written append-oriented audit events. Browser-side role selection or mutation must never be trusted.

The default application mode is `mock`. Missing or obvious placeholder Supabase values are treated as unconfigured. Public pages remain static and no Supabase client is created or network request attempted during a normal build. A Supabase-dependent client produces a controlled configuration error only when code intentionally requests it; `getCurrentUser()` instead returns `null` in mock mode.

## Security boundaries

The current protected-looking routes are **not protected**. Navigation visibility and frontend checks are not security. The helpers in `src/lib/permissions/access.ts` are preliminary application logic for planning user interfaces; they do not enforce route or data security. Likewise, the development helpers in `src/lib/entitlements` accept deliberately selectable mock state and must never be treated as production authorization.

The Next.js 16 `src/proxy.ts` file is cookie-refresh preparation only. It returns a normal response while unconfigured and does not redirect, query roles, or protect pages. Proxy cookie refresh is not authorization. Future protected Pages, Route Handlers, and Server Functions must validate identity and repeat authorization and entitlement checks on the server; RLS must independently protect rows.

Production security must include:

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
- Supabase service-role keys, provider API tokens, and webhook secrets are server-only.
- `SUPABASE_SERVICE_ROLE_KEY` must never be imported into a Client Component. It bypasses RLS and is isolated behind a `server-only` module.
- Real secrets belong in `.env.local` for local development or encrypted deployment environment settings.
- Never commit real credentials or generated secrets.

## Integration and deployment direction

Supabase Auth and PostgreSQL now have an unconfigured code foundation and a local, unapplied migration proposal. No Supabase project is connected. The future auth callback will exchange a provider code for a cookie-backed session in a server Route Handler, validate the resulting user, and redirect through an allowlisted destination. Future Supabase CLI-generated database types will replace the current typing shell after the reviewed schema exists.

Professional external providers will be selected later for age verification, payments, and private streaming. None has been chosen or integrated.

Vercel is the initial likely hosting target. Cloudflare may be evaluated later for hosting or video capabilities. Deployment must not begin until environment, security, privacy, and legal requirements have been reviewed.

## Project separation

This is a new, standalone project. It does not import, copy, move, or alter the existing Brandon Jamez Pattaya Guide or any other local project.

**The Nigirichy Stream Recorder must remain local. It must never be exposed to the public internet or made remotely controllable through this website.** No integration point for it exists here and none should be added.
