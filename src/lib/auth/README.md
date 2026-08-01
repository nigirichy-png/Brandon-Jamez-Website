# Authentication boundary

Authentication utilities identify a user and load RLS-visible account state. They do not derive trusted roles from user metadata or merge staff roles with subscriber entitlement. Display-name and account-security self-service derive identity from the validated cookie-backed session and accept no submitted user identifier.

`redirects.ts` accepts only same-origin internal continuation paths. `recovery-marker.ts` creates a short-lived HMAC marker bound to the server-validated recovery user; its HttpOnly cookie contains neither the user identifier nor a provider token. Recovery callback values are consumed only by Supabase Auth and are never logged, rendered, or manually decoded. The browser-only fallback uses cookie storage, not localStorage, because URL fragments cannot reach a server.

See `session.ts`, `access-state.ts`, and the architecture documentation.

Production uses the same callback handlers as local development. Supabase URL Configuration must point the Site URL at the canonical production origin and allow exact `/auth/confirm` and `/auth/recovery` URLs for both that origin and localhost. Vercel Preview is intentionally not configured with the server-only Supabase secret. No callback may derive a destination from an external URL, and no token, fragment, cookie, or raw provider error may be logged or rendered.
