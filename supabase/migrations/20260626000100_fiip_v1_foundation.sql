-- Fiip V1 foundation.
-- This migration is additive and keeps legacy JSON note fields for compatibility.

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

alter table if exists public.notes
  add column if not exists notebook_id uuid,
  add column if not exists is_locked boolean default false,
  add column if not exists encrypted_content text,
  add column if not exists password_hint text,
  add column if not exists deleted_at timestamp with time zone,
  add column if not exists conflict_of uuid references public.notes(id) on delete set null;

create table if not exists public.notebooks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Toutes les notes',
  color text not null default '#D97706',
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  deleted_at timestamp with time zone,
  unique(user_id, name)
);

create table if not exists public.tags (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  slug text not null,
  icon text default 'Tag',
  color integer default 4,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, slug)
);

create table if not exists public.note_tags (
  note_id uuid references public.notes(id) on delete cascade not null,
  tag_id uuid references public.tags(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key(note_id, tag_id)
);

create table if not exists public.note_tasks (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references public.notes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  status text not null default 'open' check (status in ('open', 'done', 'archived')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_at timestamp with time zone,
  reminder_at timestamp with time zone,
  source_block_id text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.note_attachments (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references public.notes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null default 'file',
  mime_type text default '',
  size_bytes bigint default 0,
  storage_path text not null,
  previewable boolean default false,
  ocr_text text default '',
  ocr_status text default 'pending' check (ocr_status in ('pending', 'complete', 'failed', 'skipped')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.note_search_index (
  note_id uuid primary key references public.notes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default '',
  search_text text default '',
  syncable boolean default true,
  ocr_status text default 'pending',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists note_search_index_text_trgm
on public.note_search_index using gin (search_text gin_trgm_ops);

create table if not exists public.note_activity (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references public.notes(id) on delete cascade not null,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.home_widgets (
  user_id uuid references auth.users(id) on delete cascade not null,
  widget_id text not null,
  enabled boolean default true,
  sort_order integer default 0,
  config jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  primary key(user_id, widget_id)
);

create table if not exists public.notebook_collaborators (
  id uuid default gen_random_uuid() primary key,
  notebook_id uuid references public.notebooks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('viewer', 'editor')) default 'viewer',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(notebook_id, user_id)
);

grant select, insert, update, delete on public.notebooks to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.note_tags to authenticated;
grant select, insert, update, delete on public.note_tasks to authenticated;
grant select, insert, update, delete on public.note_attachments to authenticated;
grant select, insert, update, delete on public.note_search_index to authenticated;
grant select, insert on public.note_activity to authenticated;
grant select, insert, update, delete on public.home_widgets to authenticated;
grant select, insert, update, delete on public.notebook_collaborators to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.notebooks enable row level security;
alter table public.tags enable row level security;
alter table public.note_tags enable row level security;
alter table public.note_tasks enable row level security;
alter table public.note_attachments enable row level security;
alter table public.note_search_index enable row level security;
alter table public.note_activity enable row level security;
alter table public.home_widgets enable row level security;
alter table public.notebook_collaborators enable row level security;

drop policy if exists "notebooks owner read write" on public.notebooks;
create policy "notebooks owner read write"
on public.notebooks for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notebooks collaborators read" on public.notebooks;
create policy "notebooks collaborators read"
on public.notebooks for select to authenticated
using (
  exists (
    select 1 from public.notebook_collaborators nc
    where nc.notebook_id = public.notebooks.id
      and nc.user_id = (select auth.uid())
  )
);

drop policy if exists "tags owner read write" on public.tags;
create policy "tags owner read write"
on public.tags for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "note tags owner or collaborator read write" on public.note_tags;
create policy "note tags owner or collaborator read write"
on public.note_tags for all to authenticated
using (
  exists (
    select 1 from public.notes n
    where n.id = note_id
      and (
        n.user_id = (select auth.uid())
        or exists (
          select 1 from public.note_collaborators nc
          where nc.note_id = n.id
            and nc.user_id = (select auth.uid())
            and nc.role = 'editor'
        )
      )
  )
)
with check (
  exists (
    select 1 from public.notes n
    where n.id = note_id
      and n.user_id = (select auth.uid())
  )
);

drop policy if exists "note tasks owner or editor" on public.note_tasks;
create policy "note tasks owner or editor"
on public.note_tasks for all to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.note_collaborators nc
    where nc.note_id = note_tasks.note_id
      and nc.user_id = (select auth.uid())
      and nc.role = 'editor'
  )
)
with check (user_id = (select auth.uid()));

drop policy if exists "note attachments owner or collaborator read" on public.note_attachments;
create policy "note attachments owner or collaborator read"
on public.note_attachments for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.note_collaborators nc
    where nc.note_id = note_attachments.note_id
      and nc.user_id = (select auth.uid())
  )
);

drop policy if exists "note attachments owner write" on public.note_attachments;
create policy "note attachments owner write"
on public.note_attachments for insert to authenticated
with check (user_id = (select auth.uid()) and storage_path like (select auth.uid())::text || '/%');

drop policy if exists "note attachments owner update delete" on public.note_attachments;
create policy "note attachments owner update delete"
on public.note_attachments for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and storage_path like (select auth.uid())::text || '/%');

drop policy if exists "note search owner read write" on public.note_search_index;
create policy "note search owner read write"
on public.note_search_index for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "note activity owner or collaborator read" on public.note_activity;
create policy "note activity owner or collaborator read"
on public.note_activity for select to authenticated
using (
  exists (
    select 1 from public.notes n
    where n.id = note_id
      and (
        n.user_id = (select auth.uid())
        or exists (
          select 1 from public.note_collaborators nc
          where nc.note_id = n.id
            and nc.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "home widgets owner read write" on public.home_widgets;
create policy "home widgets owner read write"
on public.home_widgets for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "notebook collaborators owner manage" on public.notebook_collaborators;
create policy "notebook collaborators owner manage"
on public.notebook_collaborators for all to authenticated
using (
  exists (
    select 1 from public.notebooks n
    where n.id = notebook_id
      and n.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.notebooks n
    where n.id = notebook_id
      and n.user_id = (select auth.uid())
  )
);

drop policy if exists "notebook collaborators visible" on public.notebook_collaborators;
create policy "notebook collaborators visible"
on public.notebook_collaborators for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.notebooks n
    where n.id = notebook_id
      and n.user_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public)
values ('scans', 'scans', false)
on conflict (id) do update set public = false;

drop policy if exists "attachments private owner read" on storage.objects;
create policy "attachments private owner read"
on storage.objects for select to authenticated
using (
  bucket_id in ('attachments', 'scans')
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "attachments private owner insert" on storage.objects;
create policy "attachments private owner insert"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('attachments', 'scans')
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "attachments private owner update" on storage.objects;
create policy "attachments private owner update"
on storage.objects for update to authenticated
using (
  bucket_id in ('attachments', 'scans')
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('attachments', 'scans')
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "attachments private owner delete" on storage.objects;
create policy "attachments private owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id in ('attachments', 'scans')
  and (select auth.uid())::text = (storage.foldername(name))[1]
);
