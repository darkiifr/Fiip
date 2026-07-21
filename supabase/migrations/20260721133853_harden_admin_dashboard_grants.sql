-- Restrict privileged account fields to trusted server components and expose
-- only the tables required by the separate Fiip admin backend.

revoke all on public.audit_log from anon, authenticated;
revoke all on public.backup_runs from anon, authenticated;
revoke insert, update, delete on public.feature_flags from anon, authenticated;
revoke all on public.plan_limits from anon, authenticated;

grant select, insert, update, delete on public.audit_log to service_role;
grant select, insert, update, delete on public.backup_runs to service_role;
grant select, insert, update, delete on public.feature_flags to service_role;
grant select, insert, update, delete on public.files to service_role;
grant select on public.plan_limits to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.public_note_snapshots to service_role;
grant select on public.user_settings to service_role;

-- A profile owner may edit presentation, device and account-request fields,
-- but never billing, suspension or external identity fields. Dynamic column
-- lists keep this migration compatible with older Fiip profile schemas.
revoke insert, update on public.profiles from authenticated;

do $$
declare
  insert_columns text;
  update_columns text;
begin
  select string_agg(quote_ident(attribute.attname), ', ' order by attribute.attnum)
  into insert_columns
  from pg_attribute attribute
  where attribute.attrelid = 'public.profiles'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname not in (
      'plan_level',
      'plan_source',
      'plan_updated_at',
      'suspended_at',
      'suspension_reason',
      'clerk_user_id'
    );

  select string_agg(quote_ident(attribute.attname), ', ' order by attribute.attnum)
  into update_columns
  from pg_attribute attribute
  where attribute.attrelid = 'public.profiles'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname not in (
      'id',
      'plan_level',
      'plan_source',
      'plan_updated_at',
      'suspended_at',
      'suspension_reason',
      'clerk_user_id'
    );

  if insert_columns is not null then
    execute format('grant insert (%s) on public.profiles to authenticated', insert_columns);
  end if;
  if update_columns is not null then
    execute format('grant update (%s) on public.profiles to authenticated', update_columns);
  end if;
end;
$$;

create index if not exists audit_log_timestamp_idx
  on public.audit_log (timestamp desc);
create index if not exists backup_runs_started_at_idx
  on public.backup_runs (started_at desc);
create index if not exists profiles_updated_at_idx
  on public.profiles (updated_at desc);
create index if not exists public_note_snapshots_updated_at_idx
  on public.public_note_snapshots (updated_at desc);
