-- OpenRouter child keys are created per paid AI principal and encrypted with Supabase Vault.

create extension if not exists supabase_vault with schema vault;

create table if not exists public.openrouter_managed_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  family_group_id uuid references public.family_groups(id) on delete cascade,
  vault_secret_id uuid not null,
  key_hash text not null unique,
  key_name text not null,
  limit_usd numeric(10, 2) not null check (limit_usd > 0),
  limit_reset text not null default 'monthly' check (limit_reset = 'monthly'),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint openrouter_managed_keys_one_owner check (
    (user_id is not null and family_group_id is null) or
    (user_id is null and family_group_id is not null)
  )
);

create unique index if not exists openrouter_managed_keys_user_unique
  on public.openrouter_managed_keys(user_id)
  where user_id is not null;

create unique index if not exists openrouter_managed_keys_family_unique
  on public.openrouter_managed_keys(family_group_id)
  where family_group_id is not null;

alter table public.openrouter_managed_keys enable row level security;
revoke all on public.openrouter_managed_keys from anon;
revoke all on public.openrouter_managed_keys from authenticated;
grant select, insert, update, delete on public.openrouter_managed_keys to service_role;

create or replace function public.fiip_get_openrouter_managed_key(
  p_user_id uuid,
  p_family_group_id uuid
)
returns table (
  api_key text,
  key_hash text,
  key_name text,
  limit_usd numeric,
  limit_reset text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    (p_user_id is not null and p_family_group_id is null) or
    (p_user_id is null and p_family_group_id is not null)
  ) then
    raise exception 'Exactly one OpenRouter key owner is required';
  end if;

  return query
  select secrets.decrypted_secret,
         managed.key_hash,
         managed.key_name,
         managed.limit_usd,
         managed.limit_reset
  from public.openrouter_managed_keys as managed
  join vault.decrypted_secrets as secrets on secrets.id = managed.vault_secret_id
  where (p_user_id is not null and managed.user_id = p_user_id)
     or (p_family_group_id is not null and managed.family_group_id = p_family_group_id)
  limit 1;
end;
$$;

create or replace function public.fiip_store_openrouter_managed_key(
  p_user_id uuid,
  p_family_group_id uuid,
  p_key_hash text,
  p_plaintext_key text,
  p_key_name text,
  p_limit_usd numeric
)
returns table (
  api_key text,
  key_hash text,
  key_name text,
  limit_usd numeric,
  limit_reset text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_managed public.openrouter_managed_keys%rowtype;
  v_secret_id uuid;
begin
  if not (
    (p_user_id is not null and p_family_group_id is null) or
    (p_user_id is null and p_family_group_id is not null)
  ) then
    raise exception 'Exactly one OpenRouter key owner is required';
  end if;
  if coalesce(length(p_key_hash), 0) < 16 or coalesce(length(p_plaintext_key), 0) < 16 then
    raise exception 'Invalid OpenRouter key material';
  end if;
  if coalesce(p_limit_usd, 0) <= 0 then
    raise exception 'OpenRouter key limit must be positive';
  end if;

  select managed.* into v_managed
  from public.openrouter_managed_keys as managed
  where (p_user_id is not null and managed.user_id = p_user_id)
     or (p_family_group_id is not null and managed.family_group_id = p_family_group_id)
  for update;

  if not found then
    begin
      select vault.create_secret(
        p_plaintext_key,
        'fiip-openrouter-' || p_key_hash,
        'Managed OpenRouter child key for a Fiip AI subscription'
      ) into v_secret_id;

      insert into public.openrouter_managed_keys (
        user_id,
        family_group_id,
        vault_secret_id,
        key_hash,
        key_name,
        limit_usd
      ) values (
        p_user_id,
        p_family_group_id,
        v_secret_id,
        p_key_hash,
        left(p_key_name, 120),
        p_limit_usd
      )
      returning * into v_managed;
    exception when unique_violation then
      select managed.* into v_managed
      from public.openrouter_managed_keys as managed
      where (p_user_id is not null and managed.user_id = p_user_id)
         or (p_family_group_id is not null and managed.family_group_id = p_family_group_id)
      for update;
    end;
  end if;

  if v_managed.id is null then
    raise exception 'OpenRouter key owner conflict';
  end if;

  return query
  select secrets.decrypted_secret,
         v_managed.key_hash,
         v_managed.key_name,
         v_managed.limit_usd,
         v_managed.limit_reset
  from vault.decrypted_secrets as secrets
  where secrets.id = v_managed.vault_secret_id;
end;
$$;

create or replace function public.fiip_update_openrouter_managed_key(
  p_key_hash text,
  p_key_name text,
  p_limit_usd numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(p_limit_usd, 0) <= 0 then
    raise exception 'OpenRouter key limit must be positive';
  end if;

  update public.openrouter_managed_keys
  set key_name = left(p_key_name, 120),
      limit_usd = p_limit_usd,
      limit_reset = 'monthly',
      updated_at = timezone('utc'::text, now())
  where key_hash = p_key_hash;
end;
$$;

revoke all on function public.fiip_get_openrouter_managed_key(uuid, uuid) from public, anon, authenticated;
revoke all on function public.fiip_store_openrouter_managed_key(uuid, uuid, text, text, text, numeric) from public, anon, authenticated;
revoke all on function public.fiip_update_openrouter_managed_key(text, text, numeric) from public, anon, authenticated;

grant execute on function public.fiip_get_openrouter_managed_key(uuid, uuid) to service_role;
grant execute on function public.fiip_store_openrouter_managed_key(uuid, uuid, text, text, text, numeric) to service_role;
grant execute on function public.fiip_update_openrouter_managed_key(text, text, numeric) to service_role;
