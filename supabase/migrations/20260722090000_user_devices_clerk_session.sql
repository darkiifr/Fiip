alter table public.user_devices
add column if not exists clerk_session_id text;

create index if not exists user_devices_clerk_session_idx
on public.user_devices (clerk_session_id)
where clerk_session_id is not null;

