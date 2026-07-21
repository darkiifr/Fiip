-- Zero-knowledge storage, R2 attachment metadata, public snapshots, feature flags and backup audit foundation.

create extension if not exists pgcrypto;

create or replace function public.fiip_current_user_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    auth.uid(),
    nullif(auth.jwt() ->> 'fiip_user_id', '')::uuid,
    case
      when (auth.jwt() ->> 'sub') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (auth.jwt() ->> 'sub')::uuid
      else null
    end
  );
$$;

revoke all on function public.fiip_current_user_id() from public;
grant execute on function public.fiip_current_user_id() to anon, authenticated;

alter table if exists public.profiles
  add column if not exists clerk_user_id text unique,
  add column if not exists suspended_at timestamp with time zone,
  add column if not exists suspension_reason text;

alter table if exists public.notes
  add column if not exists encrypted_title text,
  add column if not exists encrypted_content_v2 text,
  add column if not exists encrypted_ocr text,
  add column if not exists note_size_bytes bigint not null default 0;

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  note_id uuid references public.notes(id) on delete set null,
  file_key text not null unique,
  file_name text not null,
  file_type text not null default 'application/octet-stream',
  file_size bigint not null default 0,
  encrypted_checksum text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed', 'deleted')),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  confirmed_at timestamp with time zone,
  deleted_at timestamp with time zone
);

create index if not exists files_owner_status_idx on public.files(owner_id, status, created_at desc);
create index if not exists files_note_id_idx on public.files(note_id);

alter table public.files enable row level security;
grant select, insert, update, delete on public.files to authenticated;

drop policy if exists "files owner read" on public.files;
create policy "files owner read"
on public.files for select to authenticated
using (owner_id = public.fiip_current_user_id());

drop policy if exists "files owner insert" on public.files;
create policy "files owner insert"
on public.files for insert to authenticated
with check (owner_id = public.fiip_current_user_id() and file_key like owner_id::text || '/%');

drop policy if exists "files owner update" on public.files;
create policy "files owner update"
on public.files for update to authenticated
using (owner_id = public.fiip_current_user_id())
with check (owner_id = public.fiip_current_user_id() and file_key like owner_id::text || '/%');

alter table if exists public.note_attachments
  add column if not exists file_id uuid references public.files(id) on delete set null,
  add column if not exists encrypted_name text,
  add column if not exists encrypted_ocr_text text;

alter table public.user_settings
  add column if not exists owner_id uuid,
  add column if not exists settings jsonb,
  add column if not exists device_id text;

update public.user_settings set owner_id = user_id where owner_id is null and user_id is not null;
update public.user_settings set settings = config where settings is null and config is not null;

create unique index if not exists user_settings_owner_unique
on public.user_settings(owner_id)
where owner_id is not null;

drop policy if exists "users manage their settings" on public.user_settings;
create policy "users manage their settings"
on public.user_settings for all to authenticated
using (coalesce(owner_id, user_id) = public.fiip_current_user_id())
with check (coalesce(owner_id, user_id) = public.fiip_current_user_id());

create table if not exists public.public_note_snapshots (
  note_id uuid primary key references public.notes(id) on delete cascade,
  owner_id uuid not null,
  public_slug text not null unique,
  title text not null default '',
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  badges jsonb not null default '[]'::jsonb,
  author_profile jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unpublished_at timestamp with time zone
);

alter table public.public_note_snapshots enable row level security;
grant select on public.public_note_snapshots to anon, authenticated;
grant insert, update, delete on public.public_note_snapshots to authenticated;

drop policy if exists "public snapshots visible when published" on public.public_note_snapshots;
create policy "public snapshots visible when published"
on public.public_note_snapshots for select to anon, authenticated
using (unpublished_at is null);

drop policy if exists "public snapshots owner write" on public.public_note_snapshots;
create policy "public snapshots owner write"
on public.public_note_snapshots for all to authenticated
using (owner_id = public.fiip_current_user_id())
with check (owner_id = public.fiip_current_user_id());

create table if not exists public.feature_flags (
  feature_key text primary key,
  scope text not null default 'all' check (scope in ('app', 'mobile', 'site', 'all')),
  status text not null default 'enabled' check (status in ('enabled', 'disabled', 'degraded')),
  message text not null default '',
  reason text not null default '',
  expected_reactivation_at timestamp with time zone,
  enabled_for jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.feature_flags enable row level security;
grant select on public.feature_flags to anon, authenticated;

drop policy if exists "feature flags public read" on public.feature_flags;
create policy "feature flags public read"
on public.feature_flags for select to anon, authenticated
using (true);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id text not null,
  action text not null,
  target_table text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  timestamp timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.audit_log enable row level security;

create table if not exists public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  backup_key text not null unique,
  size_bytes bigint not null default 0,
  checksum text not null,
  status text not null default 'pending' check (status in ('pending', 'complete', 'failed', 'restoring', 'restored')),
  started_at timestamp with time zone not null default timezone('utc'::text, now()),
  completed_at timestamp with time zone,
  restored_at timestamp with time zone,
  restored_by text,
  error text
);

alter table public.backup_runs enable row level security;

drop function if exists public.get_public_note_by_slug(text);
create or replace function public.get_public_note_by_slug(p_slug text)
returns table (
  id uuid,
  title text,
  content text,
  attachments jsonb,
  tags jsonb,
  badges jsonb,
  public_slug text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  is_favorite boolean,
  author_username text,
  author_avatar_url text,
  author_bio text,
  author_accent_color text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.note_id as id,
    s.title,
    s.content,
    coalesce(s.attachments, '[]'::jsonb) as attachments,
    coalesce(s.tags, '[]'::jsonb) as tags,
    coalesce(s.badges, '[]'::jsonb) as badges,
    s.public_slug,
    s.created_at,
    s.updated_at,
    false as is_favorite,
    coalesce(s.author_profile ->> 'username', 'Utilisateur Fiip') as author_username,
    nullif(s.author_profile ->> 'avatar_url', '') as author_avatar_url,
    nullif(s.author_profile ->> 'bio', '') as author_bio,
    coalesce(nullif(s.author_profile ->> 'accent_color', ''), '#D97706') as author_accent_color
  from public.public_note_snapshots s
  where s.public_slug = p_slug
    and s.unpublished_at is null
  limit 1;
$$;

revoke all on function public.get_public_note_by_slug(text) from public;
grant execute on function public.get_public_note_by_slug(text) to anon, authenticated;

