-- Require display-name changes to pass through update_own_display_name so each
-- successful self-service update has an atomic, data-minimized audit event.

begin;

revoke update (display_name) on table public.profiles from authenticated;

comment on policy "profiles_update_own_display_name" on public.profiles is
  'Retained as defense in depth; direct authenticated UPDATE is not granted. Use update_own_display_name(text).';

commit;
