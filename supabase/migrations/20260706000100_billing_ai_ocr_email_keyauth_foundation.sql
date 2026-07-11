-- Billing, AI usage, OCR quotas, email logs, and KeyAuth/Lemon Squeezy webhook state.

create extension if not exists "uuid-ossp";

alter table public.profiles
  add column if not exists plan_level numeric not null default 0,
  add column if not exists plan_source text not null default 'free',
  add column if not exists plan_updated_at timestamp with time zone default timezone('utc'::text, now());

create table if not exists public.family_groups (
  id uuid default gen_random_uuid() primary key,
  owner_user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Fiip Family',
  ai_budget_limit_eur numeric(10,4) not null default 2.0000,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.family_members (
  id uuid default gen_random_uuid() primary key,
  family_group_id uuid references public.family_groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_email text,
  status text not null default 'active' check (status in ('invited', 'active', 'removed')),
  ai_budget_share_eur numeric(10,4),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(family_group_id, user_id)
);

create table if not exists public.licenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ls_customer_id text,
  ls_subscription_id text,
  ls_order_id text,
  ls_variant_id text,
  keyauth_license_key text,
  keyauth_subscription text,
  keyauth_level numeric,
  keyauth_webhook_id text,
  keyauth_source text,
  keyauth_sync_status text not null default 'pending' check (keyauth_sync_status in ('pending', 'synced', 'failed', 'revoked')),
  keyauth_last_sync_error text,
  tier text not null check (tier in ('basic', 'pro', 'ai', 'family_pro')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired', 'revoked', 'past_due')),
  expires_at timestamp with time zone,
  renews_at timestamp with time zone,
  billing_interval text check (billing_interval in ('monthly', 'yearly')),
  device_limit integer,
  sharing_enabled boolean not null default false,
  ai_enabled boolean not null default false,
  ocr_limit integer,
  ocr_scans_used integer not null default 0,
  ocr_period_start timestamp with time zone default timezone('utc'::text, now()),
  family_slots integer not null default 1,
  family_group_id uuid references public.family_groups(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, ls_subscription_id)
);

create table if not exists public.ai_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  family_group_id uuid references public.family_groups(id) on delete set null,
  tier text not null default 'free',
  budget_limit_eur numeric(10,4) not null default 0,
  budget_used_eur numeric(10,6) not null default 0,
  period_start timestamp with time zone not null default timezone('utc'::text, now()),
  period_end timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, period_start)
);

create table if not exists public.ai_usage_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ai_usage_id uuid references public.ai_usage(id) on delete set null,
  task_type text not null,
  requested_model text not null,
  model_used text not null,
  fallback_used boolean not null default false,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_eur numeric(10,6) not null default 0,
  provider text,
  generation_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.webhook_events (
  id uuid default gen_random_uuid() primary key,
  provider text not null default 'lemonsqueezy',
  event_id text not null,
  event_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamp with time zone,
  status text not null default 'accepted' check (status in ('accepted', 'processed', 'failed', 'duplicate')),
  error text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(provider, event_id)
);

create table if not exists public.keyauth_webhook_events (
  id uuid default gen_random_uuid() primary key,
  source_event_id text not null,
  action text not null,
  user_id uuid references auth.users(id) on delete set null,
  license_id uuid references public.licenses(id) on delete set null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  status text not null default 'accepted' check (status in ('accepted', 'processed', 'failed', 'duplicate')),
  error text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  processed_at timestamp with time zone,
  unique(source_event_id)
);

create table if not exists public.email_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  template text not null,
  recipient text not null,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  sent_at timestamp with time zone
);

create index if not exists licenses_user_status_idx on public.licenses(user_id, status);
create index if not exists licenses_ls_subscription_idx on public.licenses(ls_subscription_id);
create index if not exists ai_usage_user_period_idx on public.ai_usage(user_id, period_start desc);
create index if not exists ai_usage_events_user_created_idx on public.ai_usage_events(user_id, created_at desc);
create index if not exists email_events_user_created_idx on public.email_events(user_id, created_at desc);

grant select on public.family_groups to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select on public.licenses to authenticated;
grant select on public.ai_usage to authenticated;
grant select on public.ai_usage_events to authenticated;
grant select on public.email_events to authenticated;

alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.licenses enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.webhook_events enable row level security;
alter table public.keyauth_webhook_events enable row level security;
alter table public.email_events enable row level security;

drop policy if exists "family groups visible to members" on public.family_groups;
create policy "family groups visible to members"
on public.family_groups for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1 from public.family_members fm
    where fm.family_group_id = family_groups.id
      and fm.user_id = (select auth.uid())
      and fm.status = 'active'
  )
);

drop policy if exists "family members visible to group members" on public.family_members;
create policy "family members visible to group members"
on public.family_members for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.family_groups fg
    where fg.id = family_group_id and fg.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "family admins manage members" on public.family_members;
create policy "family admins manage members"
on public.family_members for all to authenticated
using (
  exists (
    select 1 from public.family_groups fg
    where fg.id = family_group_id and fg.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.family_groups fg
    where fg.id = family_group_id and fg.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "users read own licenses" on public.licenses;
create policy "users read own licenses"
on public.licenses for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.family_groups fg
    where fg.id = family_group_id and fg.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "users read own ai usage" on public.ai_usage;
create policy "users read own ai usage"
on public.ai_usage for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.family_groups fg
    where fg.id = family_group_id and fg.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "users read own ai usage events" on public.ai_usage_events;
create policy "users read own ai usage events"
on public.ai_usage_events for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "users read own email events" on public.email_events;
create policy "users read own email events"
on public.email_events for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.fiip_active_license(p_user_id uuid)
returns public.licenses
language sql
security invoker
stable
set search_path = public
as $$
  select l
  from public.licenses l
  where l.user_id = p_user_id
    and l.status = 'active'
    and (l.expires_at is null or l.expires_at > timezone('utc'::text, now()))
  order by l.updated_at desc
  limit 1;
$$;

create or replace function public.fiip_try_consume_ocr_scan()
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_license_id uuid;
  v_limit integer;
  v_used integer;
begin
  select id, ocr_limit, ocr_scans_used
  into v_license_id, v_limit, v_used
  from public.licenses
  where user_id = (select auth.uid())
    and status = 'active'
    and (expires_at is null or expires_at > timezone('utc'::text, now()))
  order by updated_at desc
  limit 1
  for update;

  if v_license_id is null then
    return false;
  end if;

  if v_limit is null then
    return true;
  end if;

  if v_used >= v_limit then
    return false;
  end if;

  update public.licenses
  set ocr_scans_used = ocr_scans_used + 1,
      updated_at = timezone('utc'::text, now())
  where id = v_license_id;

  return true;
end;
$$;

create or replace function public.fiip_reset_subscription_period(
  p_user_id uuid,
  p_tier text,
  p_budget_limit_eur numeric,
  p_period_start timestamp with time zone default timezone('utc'::text, now()),
  p_period_end timestamp with time zone default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.licenses
  set ocr_scans_used = 0,
      ocr_period_start = p_period_start,
      updated_at = timezone('utc'::text, now())
  where user_id = p_user_id and status = 'active';

  insert into public.ai_usage (user_id, tier, budget_limit_eur, budget_used_eur, period_start, period_end)
  values (p_user_id, p_tier, p_budget_limit_eur, 0, p_period_start, p_period_end)
  on conflict (user_id, period_start)
  do update set
    tier = excluded.tier,
    budget_limit_eur = excluded.budget_limit_eur,
    budget_used_eur = 0,
    period_end = excluded.period_end,
    updated_at = timezone('utc'::text, now());
end;
$$;

create or replace function public.increment_ai_budget_used(p_usage_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_usage
  set budget_used_eur = budget_used_eur + greatest(p_amount, 0),
      updated_at = timezone('utc'::text, now())
  where id = p_usage_id;
end;
$$;

revoke all on function public.fiip_active_license(uuid) from public;
revoke all on function public.fiip_try_consume_ocr_scan() from public;
revoke all on function public.fiip_reset_subscription_period(uuid, text, numeric, timestamp with time zone, timestamp with time zone) from public;
revoke all on function public.increment_ai_budget_used(uuid, numeric) from public;
grant execute on function public.fiip_active_license(uuid) to authenticated;
grant execute on function public.fiip_try_consume_ocr_scan() to authenticated;
