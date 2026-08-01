-- The server-only secret authenticates as service_role. RLS bypass does not
-- replace SQL privileges, so grant only the columns used by admin summaries.

begin;

grant select (id, display_name)
  on table public.profiles
  to service_role;

grant select (user_id, role)
  on table public.user_roles
  to service_role;

grant select (user_id, blocked)
  on table public.account_restrictions
  to service_role;

grant select (user_id, status)
  on table public.age_verifications
  to service_role;

grant select (user_id, status)
  on table public.subscriptions
  to service_role;

commit;
