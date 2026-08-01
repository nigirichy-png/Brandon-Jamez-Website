# Authentication boundary

Authentication utilities identify a user and load RLS-visible account state. They do not derive trusted roles from user metadata or merge staff roles with subscriber entitlement. Display-name self-service derives identity from the validated cookie-backed session and accepts no submitted user identifier. See `session.ts`, `access-state.ts`, and the architecture documentation.
