-- LOCAL AND UNAPPLIED: review in a disposable local Supabase environment first.
-- This migration establishes only the initial identity, role, restriction,
-- age-verification, and subscription state required for future authorization.

begin;

create schema if not exists private;
revoke all on schema private from public;

create type public.app_role as enum (
  'subscriber',
  'moderator',
  'content_manager',
  'admin'
);

create type public.age_verification_status as enum (
  'pending',
  'verified',
  'failed',
  'expired',
  'revoked'
);

create type public.subscription_status as enum (
  'inactive',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  primary key (user_id, role)
);

create index user_roles_role_idx on public.user_roles (role);

create table public.account_restrictions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  blocked boolean not null default false,
  reason text check (char_length(reason) <= 1000),
  blocked_at timestamptz,
  blocked_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint account_restrictions_block_state_check check (
    (blocked and blocked_at is not null)
    or (not blocked and blocked_at is null and blocked_by is null)
  )
);

create table public.age_verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (char_length(provider) between 1 and 100),
  verification_reference text not null check (char_length(verification_reference) between 1 and 255),
  status public.age_verification_status not null default 'pending',
  age_verified boolean not null default false,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, verification_reference),
  constraint age_verifications_verified_state_check check (
    (status = 'verified' and age_verified and verified_at is not null)
    or (status <> 'verified' and not age_verified)
  )
);

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (char_length(provider) between 1 and 100),
  provider_customer_reference text check (char_length(provider_customer_reference) <= 255),
  provider_subscription_reference text check (char_length(provider_subscription_reference) <= 255),
  status public.subscription_status not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_reference)
);

create index subscriptions_status_idx on public.subscriptions (status);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger account_restrictions_set_updated_at
before update on public.account_restrictions
for each row execute function private.set_updated_at();

create trigger age_verifications_set_updated_at
before update on public.age_verifications
for each row execute function private.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function private.set_updated_at();

-- SECURITY DEFINER is required so this helper can inspect user_roles without an
-- RLS policy recursively querying the same table. The fixed empty search_path
-- and fully qualified object names prevent search-path substitution attacks.
create function private.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = required_role
  );
$$;

revoke all on function private.has_role(public.app_role) from public;
grant usage on schema private to authenticated;
grant execute on function private.has_role(public.app_role) to authenticated;

-- Create only the non-sensitive profile shell. No user metadata is copied and
-- roles are never derived from raw_user_meta_data.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.account_restrictions enable row level security;
alter table public.age_verifications enable row level security;
alter table public.subscriptions enable row level security;

-- Remove the default Data API surface, then add only the minimum self-read and
-- basic-profile update grants. Trusted workflows will use reviewed server code.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
revoke all on table public.account_restrictions from anon, authenticated;
revoke all on table public.age_verifications from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;
grant select (user_id, role, created_at) on table public.user_roles to authenticated;
grant select (user_id, blocked, blocked_at, updated_at) on table public.account_restrictions to authenticated;
grant select (user_id, status, age_verified, verified_at, expires_at, updated_at)
  on table public.age_verifications to authenticated;
grant select (user_id, status, current_period_end, cancel_at_period_end, updated_at)
  on table public.subscriptions to authenticated;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own_display_name"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "user_roles_select_own"
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "account_restrictions_select_own"
on public.account_restrictions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "age_verifications_select_own"
on public.age_verifications
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

-- No authenticated INSERT/UPDATE/DELETE policies exist for roles,
-- restrictions, verification state, or subscriptions. Users therefore cannot
-- grant roles, unblock accounts, verify age, or activate subscriptions.

comment on function private.has_role(public.app_role) is
  'Checks the current auth.uid() against trusted user_roles. Not based on editable user metadata.';
comment on table public.age_verifications is
  'Minimal external verification result state. Never store document images, selfies, liveness recordings, document numbers, or full identity data.';
comment on table public.subscriptions is
  'Minimal provider subscription state updated only by trusted verified webhook processing.';

commit;
