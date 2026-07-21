-- Server-owned trials and aggregate Family Pro quotas.

alter table public.profiles
  add column if not exists trial_started_at timestamp with time zone,
  add column if not exists trial_ends_at timestamp with time zone,
  add column if not exists trial_consumed_at timestamp with time zone;

insert into public.plan_limits (
  plan_level,
  plan_key,
  note_count_limit,
  note_storage_bytes,
  attachment_storage_bytes,
  max_note_bytes,
  max_attachment_bytes,
  attachments_per_note
) values (
  -1,
  'trial',
  50,
  26214400,
  262144000,
  2097152,
  52428800,
  5
)
on conflict (plan_level) do update set
  plan_key = excluded.plan_key,
  note_count_limit = excluded.note_count_limit,
  note_storage_bytes = excluded.note_storage_bytes,
  attachment_storage_bytes = excluded.attachment_storage_bytes,
  max_note_bytes = excluded.max_note_bytes,
  max_attachment_bytes = excluded.max_attachment_bytes,
  attachments_per_note = excluded.attachments_per_note;

create or replace function public.fiip_plan_level(p_user_id uuid)
returns numeric
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select case
    when profile.plan_source = 'trial' and profile.trial_ends_at > timezone('utc'::text, now()) then 2
    when profile.plan_source = 'trial' then 0
    else coalesce(profile.plan_level, 0)
  end
  from public.profiles profile
  where profile.id = p_user_id;
$$;

revoke all on function public.fiip_plan_level(uuid) from public;
grant execute on function public.fiip_plan_level(uuid) to authenticated, service_role;

create or replace function fiip_private.resolve_plan_limits(p_user_id uuid)
returns public.plan_limits
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select limits.*
  from public.plan_limits limits
  where limits.plan_level = coalesce((
    select case
      when profile.plan_source = 'trial' and profile.trial_ends_at > timezone('utc'::text, now()) then -1
      when profile.plan_source = 'trial' then 0
      else least(4, greatest(0, floor(profile.plan_level)::integer))
    end
    from public.profiles profile
    where profile.id = p_user_id
  ), 0);
$$;

create or replace function fiip_private.family_quota_group(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (
      select members.family_group_id
      from public.family_members members
      where members.user_id = p_user_id
        and members.status = 'active'
      order by members.updated_at desc
      limit 1
    ),
    (
      select groups.id
      from public.family_groups groups
      where groups.owner_user_id = p_user_id
      order by groups.updated_at desc
      limit 1
    )
  );
$$;

revoke all on function fiip_private.family_quota_group(uuid) from public;
grant execute on function fiip_private.family_quota_group(uuid) to service_role;

create or replace function fiip_private.is_family_quota_member(p_user_id uuid, p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.family_groups groups
    where groups.id = p_group_id and groups.owner_user_id = p_user_id
  ) or exists (
    select 1 from public.family_members members
    where members.family_group_id = p_group_id
      and members.user_id = p_user_id
      and members.status = 'active'
  );
$$;

revoke all on function fiip_private.is_family_quota_member(uuid, uuid) from public;
grant execute on function fiip_private.is_family_quota_member(uuid, uuid) to service_role;

create or replace function public.fiip_admin_quota_summary(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, fiip_private
as $$
declare
  limits public.plan_limits;
  quota_group uuid;
  notes_used bigint;
  note_bytes_used bigint;
  attachment_bytes_used bigint;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into limits from fiip_private.resolve_plan_limits(p_user_id);
  if limits.plan_key = 'family_pro' then quota_group := fiip_private.family_quota_group(p_user_id); end if;

  select count(*), coalesce(sum(notes.note_size_bytes), 0)
  into notes_used, note_bytes_used
  from public.notes notes
  where notes.deleted_at is null
    and coalesce(notes.deleted, false) = false
    and (
      (quota_group is null and notes.user_id = p_user_id)
      or (quota_group is not null and fiip_private.is_family_quota_member(notes.user_id, quota_group))
    );

  select coalesce(sum(files.file_size), 0)
  into attachment_bytes_used
  from public.files files
  where files.status in ('pending', 'confirmed')
    and (
      (quota_group is null and files.owner_id = p_user_id)
      or (quota_group is not null and fiip_private.is_family_quota_member(files.owner_id, quota_group))
    );

  return jsonb_build_object(
    'plan_key', limits.plan_key,
    'shared_family', quota_group is not null,
    'notes_used', notes_used,
    'note_count_limit', limits.note_count_limit,
    'note_bytes_used', note_bytes_used,
    'note_storage_bytes', limits.note_storage_bytes,
    'attachment_bytes_used', attachment_bytes_used,
    'attachment_storage_bytes', limits.attachment_storage_bytes,
    'max_note_bytes', limits.max_note_bytes,
    'max_attachment_bytes', limits.max_attachment_bytes,
    'attachments_per_note', limits.attachments_per_note
  );
end;
$$;

revoke all on function public.fiip_admin_quota_summary(uuid) from public, anon, authenticated;
grant execute on function public.fiip_admin_quota_summary(uuid) to service_role;

create or replace function public.fiip_start_trial()
returns table (plan_key text, plan_level numeric, trial_started_at timestamp with time zone, trial_ends_at timestamp with time zone)
language plpgsql
security definer
set search_path = pg_catalog, public, fiip_private
as $$
declare
  current_id uuid := fiip_private.current_user_id();
  started timestamp with time zone := timezone('utc'::text, now());
  ending timestamp with time zone := started + interval '14 days';
begin
  if current_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  update public.profiles profile
  set plan_level = 2,
      plan_source = 'trial',
      plan_updated_at = started,
      trial_started_at = started,
      trial_ends_at = ending,
      trial_consumed_at = started
  where profile.id = current_id
    and profile.trial_consumed_at is null
    and coalesce(profile.plan_level, 0) = 0
    and not exists (
      select 1 from public.licenses license
      where license.user_id = current_id
        and license.status = 'active'
        and (license.expires_at is null or license.expires_at > started)
    );

  if not found then
    raise exception 'TRIAL_ALREADY_USED_OR_PAID';
  end if;

  return query select 'trial'::text, 2::numeric, started, ending;
end;
$$;

revoke all on function public.fiip_start_trial() from public, anon;
grant execute on function public.fiip_start_trial() to authenticated;

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
  quota_group uuid;
  used_bytes bigint;
  note_file_count bigint;
  created public.files;
begin
  if p_file_size <= 0 then raise exception 'INVALID_FILE_SIZE'; end if;
  if p_file_key <> p_owner_id::text || '/' || p_file_id::text then raise exception 'INVALID_FILE_KEY'; end if;

  select * into limits from fiip_private.resolve_plan_limits(p_owner_id);
  if limits.plan_level is null or p_file_size > limits.max_attachment_bytes then
    raise exception 'ATTACHMENT_SIZE_LIMIT_EXCEEDED';
  end if;

  if limits.plan_key = 'family_pro' then
    quota_group := fiip_private.family_quota_group(p_owner_id);
  end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(quota_group::text, p_owner_id::text), 0));

  select coalesce(sum(files.file_size), 0) into used_bytes
  from public.files files
  where files.status in ('pending', 'confirmed')
    and (
      (quota_group is null and files.owner_id = p_owner_id)
      or (quota_group is not null and fiip_private.is_family_quota_member(files.owner_id, quota_group))
    );

  if used_bytes + p_file_size > limits.attachment_storage_bytes then
    raise exception 'ATTACHMENT_STORAGE_LIMIT_EXCEEDED';
  end if;

  if p_note_id is not null and limits.attachments_per_note is not null then
    select count(*) into note_file_count
    from public.files files
    where files.owner_id = p_owner_id
      and files.note_id = p_note_id
      and files.status in ('pending', 'confirmed');
    if note_file_count >= limits.attachments_per_note then
      raise exception 'ATTACHMENT_COUNT_LIMIT_EXCEEDED';
    end if;
  end if;

  insert into public.files (id, owner_id, note_id, file_key, file_name, file_type, file_size, status)
  values (p_file_id, p_owner_id, p_note_id, p_file_key, p_file_name, p_file_type, p_file_size, 'pending')
  returning * into created;
  return created;
end;
$$;

create or replace function fiip_private.enforce_note_quota()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, fiip_private
as $$
declare
  limits public.plan_limits;
  quota_group uuid;
  note_count bigint;
  used_bytes bigint;
begin
  select * into limits from fiip_private.resolve_plan_limits(new.user_id);
  if new.note_size_bytes > limits.max_note_bytes then raise exception 'NOTE_SIZE_LIMIT_EXCEEDED'; end if;
  if limits.plan_key = 'family_pro' then quota_group := fiip_private.family_quota_group(new.user_id); end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(quota_group::text, new.user_id::text), 1));

  select
    count(*) filter (where notes.id <> new.id and notes.deleted_at is null),
    coalesce(sum(notes.note_size_bytes) filter (where notes.id <> new.id and notes.deleted_at is null), 0)
  into note_count, used_bytes
  from public.notes notes
  where (quota_group is null and notes.user_id = new.user_id)
     or (quota_group is not null and fiip_private.is_family_quota_member(notes.user_id, quota_group));

  if limits.note_count_limit is not null and note_count >= limits.note_count_limit then
    raise exception 'NOTE_COUNT_LIMIT_EXCEEDED';
  end if;
  if used_bytes + new.note_size_bytes > limits.note_storage_bytes then
    raise exception 'NOTE_STORAGE_LIMIT_EXCEEDED';
  end if;
  return new;
end;
$$;

-- Trial ownership fields are server-managed.
revoke update (trial_started_at, trial_ends_at, trial_consumed_at) on public.profiles from authenticated;
