-- Clerk identity mapping and atomic zero-knowledge storage quotas.

create schema if not exists fiip_private;
revoke all on schema fiip_private from public;
grant usage on schema fiip_private to authenticated, service_role;

create table if not exists fiip_private.identity_links (
  clerk_subject text primary key,
  user_id uuid not null unique default gen_random_uuid(),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  last_seen_at timestamp with time zone not null default timezone('utc'::text, now())
);

revoke all on fiip_private.identity_links from public, anon, authenticated;
grant select, insert, update on fiip_private.identity_links to service_role;

create or replace function fiip_private.current_user_id()
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public, fiip_private
as $$
declare
  subject text := auth.jwt() ->> 'sub';
  resolved uuid;
begin
  if subject is null or subject = '' then
    return null;
  end if;

  if subject ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return subject::uuid;
  end if;

  select links.user_id
  into resolved
  from fiip_private.identity_links links
  where links.clerk_subject = subject;

  return resolved;
end;
$$;

revoke all on function fiip_private.current_user_id() from public;
grant execute on function fiip_private.current_user_id() to authenticated, service_role;

create or replace function public.fiip_current_user_id()
returns uuid
language sql
stable
security invoker
set search_path = pg_catalog, public, fiip_private
as $$
  select fiip_private.current_user_id();
$$;

revoke all on function public.fiip_current_user_id() from public;
grant execute on function public.fiip_current_user_id() to authenticated, service_role;

create table if not exists public.plan_limits (
  plan_level integer primary key,
  plan_key text not null unique,
  note_count_limit bigint,
  note_storage_bytes bigint not null,
  attachment_storage_bytes bigint not null,
  max_note_bytes bigint not null,
  max_attachment_bytes bigint not null,
  attachments_per_note bigint
);

alter table public.plan_limits enable row level security;
revoke all on public.plan_limits from public, anon, authenticated;
grant select on public.plan_limits to service_role;

insert into public.plan_limits (
  plan_level,
  plan_key,
  note_count_limit,
  note_storage_bytes,
  attachment_storage_bytes,
  max_note_bytes,
  max_attachment_bytes,
  attachments_per_note
) values
  (0, 'free', 5, 5242880, 5242880, 524288, 5242880, 1),
  (1, 'basic', 100, 104857600, 2147483648, 5242880, 262144000, 5),
  (2, 'pro', 1000, 1073741824, 26843545600, 26214400, 2147483648, 25),
  (3, 'ai', 1000, 1073741824, 26843545600, 26214400, 2147483648, 25),
  (4, 'family_pro', null, 5368709120, 107374182400, 52428800, 5368709120, null)
on conflict (plan_level) do update set
  plan_key = excluded.plan_key,
  note_count_limit = excluded.note_count_limit,
  note_storage_bytes = excluded.note_storage_bytes,
  attachment_storage_bytes = excluded.attachment_storage_bytes,
  max_note_bytes = excluded.max_note_bytes,
  max_attachment_bytes = excluded.max_attachment_bytes,
  attachments_per_note = excluded.attachments_per_note;

create or replace function fiip_private.resolve_plan_limits(p_user_id uuid)
returns public.plan_limits
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select limits.*
  from public.plan_limits limits
  where limits.plan_level = least(
    4,
    greatest(
      0,
      coalesce((select floor(profiles.plan_level)::integer from public.profiles where profiles.id = p_user_id), 0)
    )
  );
$$;

revoke all on function fiip_private.resolve_plan_limits(uuid) from public;
grant execute on function fiip_private.resolve_plan_limits(uuid) to service_role;

create or replace function public.fiip_bootstrap_identity(
  p_subject text,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, fiip_private
as $$
declare
  resolved uuid;
begin
  if p_subject is null or p_subject = '' or length(p_subject) > 255 then
    raise exception 'INVALID_IDENTITY_SUBJECT';
  end if;

  if p_subject ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    resolved := p_subject::uuid;
  else
    insert into fiip_private.identity_links (clerk_subject)
    values (p_subject)
    on conflict (clerk_subject) do update
    set last_seen_at = timezone('utc'::text, now())
    returning user_id into resolved;
  end if;

  insert into public.profiles (
    id,
    username,
    nickname,
    avatar_url,
    bio,
    accent_color,
    skills,
    clerk_user_id,
    updated_at
  )
  values (
    resolved,
    'fiip-' || left(replace(resolved::text, '-', ''), 12),
    coalesce(nullif(split_part(coalesce(p_email, ''), '@', 1), ''), 'Utilisateur Fiip'),
    '',
    '',
    '#5865F2',
    '[]'::jsonb,
    case when p_subject = resolved::text then null else p_subject end,
    timezone('utc'::text, now())
  )
  on conflict (id) do update
  set clerk_user_id = coalesce(excluded.clerk_user_id, profiles.clerk_user_id),
      updated_at = excluded.updated_at;

  return resolved;
end;
$$;

revoke all on function public.fiip_bootstrap_identity(text, text) from public;
grant execute on function public.fiip_bootstrap_identity(text, text) to service_role;

-- Application ownership must not depend on a row in auth.users. Existing
-- Supabase users already have profiles; Clerk identities receive one during
-- identity bootstrap. Keep the original delete behavior on each relationship.
do $$
declare
  relation record;
  delete_action text;
  replacement_name text;
begin
  for relation in
    select
      constraint_row.oid,
      namespace_row.nspname as schema_name,
      table_row.relname as table_name,
      constraint_row.conname,
      constraint_row.confdeltype,
      attribute_row.attname as column_name
    from pg_constraint constraint_row
    join pg_class table_row on table_row.oid = constraint_row.conrelid
    join pg_namespace namespace_row on namespace_row.oid = table_row.relnamespace
    join pg_attribute attribute_row
      on attribute_row.attrelid = constraint_row.conrelid
      and attribute_row.attnum = constraint_row.conkey[1]
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'auth.users'::regclass
      and namespace_row.nspname = 'public'
      and cardinality(constraint_row.conkey) = 1
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      relation.schema_name,
      relation.table_name,
      relation.conname
    );

    if relation.table_name <> 'profiles' then
      delete_action := case relation.confdeltype
        when 'c' then 'cascade'
        when 'n' then 'set null'
        when 'd' then 'set default'
        when 'r' then 'restrict'
        else 'no action'
      end;
      replacement_name := left(relation.conname || '_fiip_identity', 63);
      execute format(
        'alter table %I.%I add constraint %I foreign key (%I) references public.profiles(id) on delete %s not valid',
        relation.schema_name,
        relation.table_name,
        replacement_name,
        relation.column_name,
        delete_action
      );
    end if;
  end loop;
end;
$$;

create or replace function fiip_private.begin_file_upload(
  p_owner_id uuid,
  p_file_id uuid,
  p_note_id uuid,
  p_file_key text,
  p_file_name text,
  p_file_type text,
  p_file_size bigint
)
returns public.files
language plpgsql
security definer
set search_path = pg_catalog, public, fiip_private
as $$
declare
  limits public.plan_limits;
  used_bytes bigint;
  note_file_count bigint;
  created public.files;
begin
  if p_file_size <= 0 then
    raise exception 'INVALID_FILE_SIZE';
  end if;
  if p_file_key <> p_owner_id::text || '/' || p_file_id::text then
    raise exception 'INVALID_FILE_KEY';
  end if;

  select * into limits from fiip_private.resolve_plan_limits(p_owner_id);
  if limits.plan_level is null or p_file_size > limits.max_attachment_bytes then
    raise exception 'ATTACHMENT_SIZE_LIMIT_EXCEEDED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));
  select coalesce(sum(files.file_size), 0)
  into used_bytes
  from public.files
  where files.owner_id = p_owner_id
    and files.status in ('pending', 'confirmed');

  if used_bytes + p_file_size > limits.attachment_storage_bytes then
    raise exception 'ATTACHMENT_STORAGE_LIMIT_EXCEEDED';
  end if;

  if p_note_id is not null and limits.attachments_per_note is not null then
    select count(*)
    into note_file_count
    from public.files
    where files.owner_id = p_owner_id
      and files.note_id = p_note_id
      and files.status in ('pending', 'confirmed');
    if note_file_count >= limits.attachments_per_note then
      raise exception 'ATTACHMENT_COUNT_LIMIT_EXCEEDED';
    end if;
  end if;

  insert into public.files (
    id,
    owner_id,
    note_id,
    file_key,
    file_name,
    file_type,
    file_size,
    status
  ) values (
    p_file_id,
    p_owner_id,
    p_note_id,
    p_file_key,
    p_file_name,
    p_file_type,
    p_file_size,
    'pending'
  )
  returning * into created;

  return created;
end;
$$;

revoke all on function fiip_private.begin_file_upload(uuid, uuid, uuid, text, text, text, bigint) from public;
grant execute on function fiip_private.begin_file_upload(uuid, uuid, uuid, text, text, text, bigint) to service_role;

create or replace function public.fiip_begin_file_upload(
  p_owner_id uuid,
  p_file_id uuid,
  p_note_id uuid,
  p_file_key text,
  p_file_name text,
  p_file_type text,
  p_file_size bigint
)
returns public.files
language sql
security invoker
set search_path = pg_catalog, public, fiip_private
as $$
  select fiip_private.begin_file_upload(
    p_owner_id,
    p_file_id,
    p_note_id,
    p_file_key,
    p_file_name,
    p_file_type,
    p_file_size
  );
$$;

revoke all on function public.fiip_begin_file_upload(uuid, uuid, uuid, text, text, text, bigint) from public;
grant execute on function public.fiip_begin_file_upload(uuid, uuid, uuid, text, text, text, bigint) to service_role;

create or replace function fiip_private.enforce_note_quota()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, fiip_private
as $$
declare
  limits public.plan_limits;
  note_count bigint;
  used_bytes bigint;
begin
  select * into limits from fiip_private.resolve_plan_limits(new.user_id);
  if new.note_size_bytes > limits.max_note_bytes then
    raise exception 'NOTE_SIZE_LIMIT_EXCEEDED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 1));
  select
    count(*) filter (where notes.id <> new.id and notes.deleted_at is null),
    coalesce(sum(notes.note_size_bytes) filter (where notes.id <> new.id and notes.deleted_at is null), 0)
  into note_count, used_bytes
  from public.notes
  where notes.user_id = new.user_id;

  if limits.note_count_limit is not null and note_count >= limits.note_count_limit then
    raise exception 'NOTE_COUNT_LIMIT_EXCEEDED';
  end if;
  if used_bytes + new.note_size_bytes > limits.note_storage_bytes then
    raise exception 'NOTE_STORAGE_LIMIT_EXCEEDED';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_note_quota on public.notes;
create trigger enforce_note_quota
before insert or update of note_size_bytes on public.notes
for each row execute function fiip_private.enforce_note_quota();

-- Replace the core ownership policies with a provider-neutral identity helper.
drop policy if exists "notes owned readable" on public.notes;
create policy "notes owned readable"
on public.notes for select to authenticated
using (user_id = public.fiip_current_user_id());

drop policy if exists "users insert their own notes" on public.notes;
create policy "users insert their own notes"
on public.notes for insert to authenticated
with check (user_id = public.fiip_current_user_id());

drop policy if exists "owners update their notes" on public.notes;
create policy "owners update their notes"
on public.notes for update to authenticated
using (user_id = public.fiip_current_user_id())
with check (user_id = public.fiip_current_user_id());

drop policy if exists "owners delete their notes" on public.notes;
create policy "owners delete their notes"
on public.notes for delete to authenticated
using (user_id = public.fiip_current_user_id());

drop policy if exists "users manage their settings" on public.user_settings;
create policy "users manage their settings"
on public.user_settings for all to authenticated
using (coalesce(owner_id, user_id) = public.fiip_current_user_id())
with check (coalesce(owner_id, user_id) = public.fiip_current_user_id());

drop policy if exists "note attachments owner write" on public.note_attachments;
create policy "note attachments owner write"
on public.note_attachments for insert to authenticated
with check (user_id = public.fiip_current_user_id());

drop policy if exists "note attachments owner update delete" on public.note_attachments;
create policy "note attachments owner update delete"
on public.note_attachments for update to authenticated
using (user_id = public.fiip_current_user_id())
with check (user_id = public.fiip_current_user_id());

drop policy if exists "note attachments owner delete" on public.note_attachments;
create policy "note attachments owner delete"
on public.note_attachments for delete to authenticated
using (user_id = public.fiip_current_user_id());

-- Rewrite remaining application policies (devices, notebooks, billing,
-- collaboration and family tables) to the provider-neutral identity helper.
do $$
declare
  policy_row record;
  using_expression text;
  check_expression text;
begin
  for policy_row in
    select
      policy.oid,
      namespace_row.nspname as schema_name,
      table_row.relname as table_name,
      policy.polname,
      pg_get_expr(policy.polqual, policy.polrelid) as using_expression,
      pg_get_expr(policy.polwithcheck, policy.polrelid) as check_expression
    from pg_policy policy
    join pg_class table_row on table_row.oid = policy.polrelid
    join pg_namespace namespace_row on namespace_row.oid = table_row.relnamespace
    where namespace_row.nspname = 'public'
  loop
    using_expression := policy_row.using_expression;
    check_expression := policy_row.check_expression;

    if using_expression is not null and using_expression like '%auth.uid()%' then
      using_expression := replace(using_expression, 'auth.uid()', 'public.fiip_current_user_id()');
      execute format(
        'alter policy %I on %I.%I using (%s)',
        policy_row.polname,
        policy_row.schema_name,
        policy_row.table_name,
        using_expression
      );
    end if;

    if check_expression is not null and check_expression like '%auth.uid()%' then
      check_expression := replace(check_expression, 'auth.uid()', 'public.fiip_current_user_id()');
      execute format(
        'alter policy %I on %I.%I with check (%s)',
        policy_row.polname,
        policy_row.schema_name,
        policy_row.table_name,
        check_expression
      );
    end if;
  end loop;
end;
$$;
