-- Account device tracking and security event history.
-- Public schema tables need explicit grants for 2026 Supabase Data API defaults.

create extension if not exists "uuid-ossp";

create table if not exists public.account_devices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  license_id uuid references public.licenses(id) on delete set null,
  installation_id uuid not null,
  platform text not null check (platform in ('desktop', 'mobile', 'web')),
  device_name text not null check (char_length(device_name) between 1 and 80),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  first_seen_at timestamp with time zone not null default timezone('utc'::text, now()),
  last_seen_at timestamp with time zone not null default timezone('utc'::text, now()),
  revoked_at timestamp with time zone,
  revoked_reason text check (revoked_reason is null or char_length(revoked_reason) <= 120),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique(user_id, installation_id)
);

create table if not exists public.account_security_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  device_id uuid references public.account_devices(id) on delete set null,
  event_type text not null check (event_type in (
    'device_registered',
    'device_heartbeat',
    'device_revoked',
    'all_devices_revoked',
    'license_activated'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists account_devices_user_last_seen_idx
  on public.account_devices(user_id, last_seen_at desc);

create index if not exists account_devices_user_active_idx
  on public.account_devices(user_id, revoked_at)
  where revoked_at is null;

create index if not exists account_security_events_user_created_idx
  on public.account_security_events(user_id, created_at desc);

grant select on public.account_devices to authenticated;
grant select on public.account_security_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.account_devices enable row level security;
alter table public.account_security_events enable row level security;

drop policy if exists "users read own account devices" on public.account_devices;
drop policy if exists "users read own account security events" on public.account_security_events;

create policy "users read own account devices"
on public.account_devices for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users read own account security events"
on public.account_security_events for select
to authenticated
using ((select auth.uid()) = user_id);
