# Authentication boundary

Authentication utilities identify a user and load RLS-visible account state. They do not derive trusted roles from user metadata or merge staff roles with subscriber entitlement. Display-name and account-security self-service derive identity from the validated cookie-backed session and accept no submitted user identifier.

`redirects.ts` accepts only same-origin internal continuation paths. `recovery-marker.ts` creates a short-lived HMAC marker bound to the server-validated recovery user; its HttpOnly cookie contains neither the user identifier nor a provider token. Recovery callback values are consumed only by Supabase Auth and are never logged, rendered, or manually decoded. The browser-only fallback uses cookie storage, not localStorage, because URL fragments cannot reach a server.

See `session.ts`, `access-state.ts`, and the architecture documentation.
