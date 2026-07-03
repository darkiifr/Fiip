create table if not exists public.user_devices (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Fiip device',
  platform text default 'unknown',
  user_agent text default '',
  ip_address text,
  last_seen_at timestamp with time zone default timezone('utc'::text, now()),
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists user_devices_user_last_seen_idx
on public.user_devices (user_id, last_seen_at desc);

grant select, insert, update, delete on public.user_devices to authenticated;

alter table public.user_devices enable row level security;

drop policy if exists "user devices owner read write" on public.user_devices;
create policy "user devices owner read write"
on public.user_devices for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
