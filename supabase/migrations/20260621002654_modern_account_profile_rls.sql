-- Fiip desktop/mobile public schema hardening for 2026 Supabase defaults.
-- New public tables need explicit grants for Data API access in addition to RLS.

create extension if not exists "uuid-ossp";

alter table if exists public.profiles
  add column if not exists nickname text,
  add column if not exists accent_color text default '#D97706',
  add column if not exists skills jsonb default '[]'::jsonb,
  add column if not exists last_session_validated timestamp with time zone,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

alter table if exists public.notes
  add column if not exists attachments jsonb default '[]'::jsonb,
  add column if not exists tags jsonb default '[]'::jsonb,
  add column if not exists badges jsonb default '[]'::jsonb,
  add column if not exists deleted boolean default false,
  add column if not exists public_slug text unique;

create table if not exists public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  config jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.user_badges (
  user_id uuid references auth.users(id) on delete cascade primary key,
  badges jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.note_collaborators (
  id uuid default uuid_generate_v4() primary key,
  note_id uuid references public.notes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('viewer', 'editor')) default 'viewer',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(note_id, user_id)
);

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.notes to anon, authenticated;
grant insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.user_badges to authenticated;
grant select, insert, update, delete on public.note_collaborators to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_badges enable row level security;
alter table public.note_collaborators enable row level security;

drop policy if exists "Authenticated users can view all profiles" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile with valid session" on public.profiles;
drop policy if exists "profiles are readable for signed in users" on public.profiles;
drop policy if exists "users insert their own profile" on public.profiles;
drop policy if exists "users update their own profile" on public.profiles;

create policy "profiles are readable for signed in users"
on public.profiles for select
to authenticated
using (true);

create policy "users insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "users update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can view their own notes OR public notes" on public.notes;
drop policy if exists "Users can insert their own notes" on public.notes;
drop policy if exists "Users can update their own notes" on public.notes;
drop policy if exists "Users can delete their own notes" on public.notes;
drop policy if exists "Collaborators can view shared notes" on public.notes;
drop policy if exists "Editor collaborators can update shared notes" on public.notes;
drop policy if exists "notes public or owned readable" on public.notes;
drop policy if exists "users insert their own notes" on public.notes;
drop policy if exists "owners update their notes" on public.notes;
drop policy if exists "owners delete their notes" on public.notes;
drop policy if exists "collaborators read shared notes" on public.notes;
drop policy if exists "editor collaborators update shared notes" on public.notes;

create policy "notes public or owned readable"
on public.notes for select
to anon, authenticated
using (public_slug is not null or (select auth.uid()) = user_id);

create policy "users insert their own notes"
on public.notes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "owners update their notes"
on public.notes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "owners delete their notes"
on public.notes for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "collaborators read shared notes"
on public.notes for select
to authenticated
using (
  exists (
    select 1 from public.note_collaborators nc
    where nc.note_id = public.notes.id
      and nc.user_id = (select auth.uid())
  )
);

create policy "editor collaborators update shared notes"
on public.notes for update
to authenticated
using (
  exists (
    select 1 from public.note_collaborators nc
    where nc.note_id = public.notes.id
      and nc.user_id = (select auth.uid())
      and nc.role = 'editor'
  )
)
with check (
  exists (
    select 1 from public.note_collaborators nc
    where nc.note_id = public.notes.id
      and nc.user_id = (select auth.uid())
      and nc.role = 'editor'
  )
);

drop policy if exists "Users can view their own settings" on public.user_settings;
drop policy if exists "Users can insert their own settings" on public.user_settings;
drop policy if exists "Users can update their own settings" on public.user_settings;
drop policy if exists "users manage their settings" on public.user_settings;

create policy "users manage their settings"
on public.user_settings for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own badges" on public.user_badges;
drop policy if exists "Users can insert their own badges" on public.user_badges;
drop policy if exists "Users can update their own badges" on public.user_badges;
drop policy if exists "users manage their badges" on public.user_badges;

create policy "users manage their badges"
on public.user_badges for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Collaborators visible to note owner and collaborators" on public.note_collaborators;
drop policy if exists "Note owners can manage collaborators" on public.note_collaborators;
drop policy if exists "collaborators visible to owners and collaborators" on public.note_collaborators;
drop policy if exists "note owners manage collaborators" on public.note_collaborators;

create policy "collaborators visible to owners and collaborators"
on public.note_collaborators for select
to authenticated
using (
  (select auth.uid()) = user_id
  or (select auth.uid()) = (
    select n.user_id from public.notes n where n.id = note_id
  )
);

create policy "note owners manage collaborators"
on public.note_collaborators for all
to authenticated
using (
  (select auth.uid()) = (
    select n.user_id from public.notes n where n.id = note_id
  )
)
with check (
  (select auth.uid()) = (
    select n.user_id from public.notes n where n.id = note_id
  )
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, username, avatar_url, bio, nickname, accent_color, skills, last_session_validated)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    '',
    coalesce(new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    '#D97706',
    '[]'::jsonb,
    now()
  )
  on conflict (id) do update set
    username = coalesce(public.profiles.username, excluded.username),
    nickname = coalesce(public.profiles.nickname, excluded.nickname),
    avatar_url = coalesce(nullif(public.profiles.avatar_url, ''), excluded.avatar_url),
    updated_at = now();

  insert into public.user_settings (user_id, config)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.refresh_profile_session()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.last_session_validated = now();
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists refresh_profile_session_timestamp on public.profiles;
create trigger refresh_profile_session_timestamp
before update on public.profiles
for each row execute function public.refresh_profile_session();

create or replace function public.get_email_by_pseudo(p_pseudo text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  select u.email into v_email
  from public.profiles p
  join auth.users u on p.id = u.id
  where lower(p.nickname) = lower(p_pseudo)
     or lower(p.username) = lower(p_pseudo)
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.refresh_profile_session() from public;
revoke all on function public.get_email_by_pseudo(text) from public;
grant execute on function public.get_email_by_pseudo(text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do update set public = false;
