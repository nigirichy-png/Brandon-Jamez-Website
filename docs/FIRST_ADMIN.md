# First administrator bootstrap

Do not assign an administrator automatically and do not expose a browser endpoint for role assignment.

Use the authenticated, linked Supabase CLI only after the first real account has been created and email-confirmed. Complete a read-only verification first and report only sanitized counts and booleans. Confirm that the linked project is the dedicated Brandon Jamez Website project, exactly one Auth user exists, its profile exists, no role is assigned, and `admin` is an available `public.app_role` value. Never print or copy the user's email address or identifier into a command, log, document, or chat.

Stop after verification and require the exact explicit authorization documented by the bootstrap task. After approval, run the insertion inside a transaction that aborts unless exactly one Auth user and its matching profile still exist:

```sql
begin;

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where (select count(*) from auth.users) = 1
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.users.id
  )
on conflict (user_id, role) do nothing;

commit;
```

The operational command must also assert before commit that exactly one `admin` row exists, no other role was added, and account-restriction, age-verification, and subscription state are unchanged. Do not add this one-time bootstrap to a migration and do not create a reusable public endpoint or browser function.

Afterward, refresh the authenticated application session and verify `/account`, `/admin`, `/admin/users`, `/admin/audit`, `/mod`, and `/content`. Subsequent administrative role and restriction changes use the reviewed authenticated database functions and protect the final active administrator atomically. Admin remains separate from subscriber entitlement: `/member` must remain denied unless professional age verification and an active subscription are independently present. A future production bootstrap procedure should add a trusted bootstrap audit event and stronger two-person review.
