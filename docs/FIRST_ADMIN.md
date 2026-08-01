# First administrator bootstrap

Do not assign an administrator automatically and do not expose a browser endpoint for role assignment.

After the first real account has been created and email-confirmed, copy its verified `auth.users.id` from the Supabase Dashboard. Do not use an email address as the authorization key. Review the UUID, then run the following only in the dedicated Brandon Jamez Website SQL Editor after explicit approval:

```sql
begin;

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where id = 'REPLACE_WITH_CONFIRMED_AUTH_USER_UUID'::uuid
on conflict (user_id, role) do nothing;

commit;
```

Before executing, replace the placeholder locally in the SQL Editor—not in a tracked migration. Confirm exactly one matching Auth user exists. Afterward, verify only the role row and test `/admin` with the validated session. A future production bootstrap procedure should add a trusted audit event and stronger two-person review.
