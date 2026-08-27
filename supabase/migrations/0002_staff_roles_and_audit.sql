-- ===========================================================================
-- 0002 - staff roles and audit history.
--
-- Run this after 0001 in the Supabase SQL Editor. The first superadmin is
-- inserted with the seed statement at the bottom after creating that user in
-- Authentication > Users.
-- ===========================================================================

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'admin'
    check (role in ('admin', 'superadmin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_role_idx on public.user_profiles (role);
create index if not exists user_profiles_active_idx on public.user_profiles (is_active);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);

alter table public.user_profiles enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "staff can read own profile" on public.user_profiles;
create policy "staff can read own profile"
  on public.user_profiles for select to authenticated
  using (id = (select auth.uid()));

-- This function is security-definer so audit-log policies do not need to query
-- user_profiles recursively through RLS.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'superadmin'
      and is_active = true
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated;

drop policy if exists "superadmins can read audit logs" on public.audit_logs;
create policy "superadmins can read audit logs"
  on public.audit_logs for select to authenticated
  using ((select public.is_superadmin()));

-- Replace YOUR_AUTH_USER_ID with the UUID from Authentication > Users after
-- creating the first account. The application creates subsequent staff users.
-- insert into public.user_profiles (id, full_name, role)
-- values ('YOUR_AUTH_USER_ID', 'Primary Owner', 'superadmin')
-- on conflict (id) do update set role = excluded.role, is_active = true;
