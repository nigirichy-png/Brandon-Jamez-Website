# Development staff authorization preview

This directory contains mock application logic only. `?staffDemo=` selects an allowlisted in-memory scenario on each server-rendered internal route. It does not create authentication, a staff account, trusted roles, cookies, browser storage, or persistent authorization.

The evaluators deliberately check authentication, account blocking, and the required role in that order. Every internal Page calls its relevant evaluator; the shared shell and navigation are presentation, not protection. Subscriber entitlement is a separate system and grants no staff role.

Production must replace mock scenarios with a validated Supabase user and trusted database role lookup, repeat authorization for every Page, Route Handler, and Server Action, constrain data through RLS, use service-role access only for narrow trusted operations, and write privileged changes to a server-controlled append-oriented audit log.

Mock moderation never contacts or acts against an external platform. Mock content, account, role, restriction, and audit actions do not persist.
