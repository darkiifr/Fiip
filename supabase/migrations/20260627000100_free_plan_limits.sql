-- Free plan limits and server-side plan source.
-- Public schema tables need explicit grants plus RLS for Supabase Data API access.

alter table public.profiles
  add column if not exists plan_level numeric not null default 0,
  add column if not exists plan_source text not null default 'free',
  add column if not exists plan_updated_at timestamp with time zone default timezone('utc'::text, now());

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select on public.notes to anon;
grant select, insert, update, delete on public.note_collaborators to authenticated;

create or replace function public.fiip_plan_level(p_user_id uuid)
returns numeric
language sql
security invoker
stable
set search_path = public
as $$
  select coalesce((select plan_level from public.profiles where id = p_user_id), 0);
$$;

create or replace function public.fiip_note_limit(p_level numeric)
returns integer
language sql
immutable
as $$
  select case
    when p_level >= 4 then 2147483647
    when p_level >= 2 then 1000
    when p_level >= 1 then 100
    else 5
  end;
$$;

create or replace function public.fiip_can_create_note(p_user_id uuid, p_note_id uuid)
returns boolean
language sql
security invoker
stable
set search_path = public
as $$
  select exists (select 1 from public.notes where id = p_note_id and user_id = p_user_id)
    or (
      select count(*)
      from public.notes
      where user_id = p_user_id
        and deleted_at is null
        and coalesce(deleted, false) = false
    ) < public.fiip_note_limit(public.fiip_plan_level(p_user_id));
$$;

drop policy if exists "users insert their own notes" on public.notes;
create policy "users insert their own notes"
on public.notes for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and public.fiip_can_create_note((select auth.uid()), id)
);

drop policy if exists "owners update their notes" on public.notes;
create policy "owners update their notes"
on public.notes for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    public.fiip_plan_level((select auth.uid())) >= 1
    or public_slug is null
  )
);

drop policy if exists "note owners manage collaborators" on public.note_collaborators;
create policy "note owners manage collaborators"
on public.note_collaborators for all
to authenticated
using (
  public.fiip_plan_level((select auth.uid())) >= 1
  and (select auth.uid()) = (
    select n.user_id from public.notes n where n.id = note_id
  )
)
with check (
  public.fiip_plan_level((select auth.uid())) >= 1
  and (select auth.uid()) = (
    select n.user_id from public.notes n where n.id = note_id
  )
);

revoke all on function public.fiip_plan_level(uuid) from public;
revoke all on function public.fiip_note_limit(numeric) from public;
revoke all on function public.fiip_can_create_note(uuid, uuid) from public;
grant execute on function public.fiip_plan_level(uuid) to authenticated;
grant execute on function public.fiip_note_limit(numeric) to authenticated;
grant execute on function public.fiip_can_create_note(uuid, uuid) to authenticated;
