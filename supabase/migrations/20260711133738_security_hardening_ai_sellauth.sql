-- Security hardening for account lookup, SellAuth idempotency, and AI budget reservations.

-- The old pseudo-to-email helper exposed auth.users.email through a public SECURITY DEFINER
-- function. Keep the function unavailable so sign-in cannot be used for account enumeration.
revoke all on function public.get_email_by_pseudo(text) from public;
revoke all on function public.get_email_by_pseudo(text) from anon;
revoke all on function public.get_email_by_pseudo(text) from authenticated;

create table if not exists public.sellauth_delivery_events (
  id uuid default gen_random_uuid() primary key,
  source_event_id text not null unique,
  event_name text not null default 'INVOICE.ITEM.DELIVER-DYNAMIC',
  customer_email text,
  product_id text,
  variant_id text,
  tier text,
  billing_interval text,
  license_key text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'accepted' check (status in ('accepted', 'processed', 'failed')),
  error text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  processed_at timestamp with time zone
);

alter table public.sellauth_delivery_events enable row level security;

-- Webhook state is service-role only. RLS stays enabled as defense-in-depth and no client
-- policies are created.
revoke all on public.sellauth_delivery_events from anon;
revoke all on public.sellauth_delivery_events from authenticated;

create or replace function public.fiip_try_reserve_ai_budget(p_usage_id uuid, p_amount numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserved boolean;
begin
  if p_usage_id is null or coalesce(p_amount, 0) < 0 then
    return false;
  end if;

  update public.ai_usage
  set budget_used_eur = budget_used_eur + p_amount,
      updated_at = timezone('utc'::text, now())
  where id = p_usage_id
    and budget_used_eur + p_amount <= budget_limit_eur
  returning true into v_reserved;

  return coalesce(v_reserved, false);
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
  set budget_used_eur = greatest(0, budget_used_eur + coalesce(p_amount, 0)),
      updated_at = timezone('utc'::text, now())
  where id = p_usage_id;
end;
$$;

revoke all on function public.fiip_try_reserve_ai_budget(uuid, numeric) from public;
revoke all on function public.increment_ai_budget_used(uuid, numeric) from public;
