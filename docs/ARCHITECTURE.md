# Future integration architecture

This document describes direction, not implemented security. The current project contains mock data and public development placeholders only.

## Authorization model

The preliminary roles are `visitor`, `subscriber`, `moderator`, `content_manager`, and `admin`. A future account may have multiple roles. Account blocking overrides role-based access.

All protected operations must use a validated server-side session and server-side authorization. Supabase Row Level Security must independently restrict database access. Frontend state, hidden navigation, route names, and the pure helpers in `src/lib/permissions/access.ts` are not security enforcement.

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

## Supabase and PostgreSQL

If selected, Supabase Auth will establish user identity while server-side code validates sessions. PostgreSQL will store the minimum required account, role, entitlement, and integration-reference data. Row Level Security policies must enforce least-privilege access independently of application UI.

Service-role credentials must remain server-only. Webhooks must verify signatures before changing account state. Provider callbacks must be idempotent and auditable.

## Operational isolation

This public website remains independent from every existing local project. In particular, the Nigirichy Stream Recorder must stay local and must never be exposed publicly or made remotely controllable from this website.
