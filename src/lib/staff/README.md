# Staff authorization and development previews

`?staffDemo=` selects an allowlisted in-memory scenario only when `NODE_ENV === "development"`. Production ignores the parameter and omits the selector from rendered HTML. A preview never creates authentication, a staff account, trusted roles, cookies, browser storage, or persistent authorization.

The evaluators deliberately check authentication, account blocking, and the required role in that order. Every internal Page calls its relevant evaluator; the shared shell and navigation are presentation, not protection. Subscriber entitlement is a separate system and grants no staff role.

Real requests use a validated Supabase user and trusted database role and restriction lookup. Every privileged Page and Server Action repeats authorization. Narrow atomic database functions enforce final-admin protection and append safe audit events; the server-secret client is isolated to authorized, data-minimized directory reads.

Mock moderation never contacts or acts against an external platform. Mock content, account, role, restriction, and audit actions do not persist.
