-- Break recursive RLS checks between notes and note_collaborators.
-- Policies must not query each other's RLS-protected table directly.

create or replace function public.fiip_note_owner_id(p_note_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select n.user_id
  from public.notes n
  where n.id = p_note_id
  limit 1;
$$;
create or replace function public.fiip_is_note_owner(p_note_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_user_id is not null
    and exists (
      select 1
      from public.notes n
      where n.id = p_note_id
        and n.user_id = p_user_id
    );
$$;
create or replace function public.fiip_is_note_collaborator(
  p_note_id uuid,
  p_user_id uuid,
  p_editor_only boolean default false
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_user_id is not null
    and exists (
      select 1
      from public.note_collaborators nc
      where nc.note_id = p_note_id
        and nc.user_id = p_user_id
        and (not p_editor_only or nc.role = 'editor')
    );
$$;
revoke all on function public.fiip_note_owner_id(uuid) from public;
revoke all on function public.fiip_is_note_owner(uuid, uuid) from public;
revoke all on function public.fiip_is_note_collaborator(uuid, uuid, boolean) from public;
grant execute on function public.fiip_note_owner_id(uuid) to authenticated;
grant execute on function public.fiip_is_note_owner(uuid, uuid) to authenticated;
grant execute on function public.fiip_is_note_collaborator(uuid, uuid, boolean) to authenticated;
drop policy if exists "Users can view their own notes OR public notes" on public.notes;
drop policy if exists "Collaborators can view shared notes" on public.notes;
drop policy if exists "Editor collaborators can update shared notes" on public.notes;
drop policy if exists "notes public or owned readable" on public.notes;
drop policy if exists "notes owned readable" on public.notes;
drop policy if exists "notes public readable" on public.notes;
drop policy if exists "notes collaborators readable" on public.notes;
drop policy if exists "collaborators read shared notes" on public.notes;
drop policy if exists "editor collaborators update shared notes" on public.notes;
create policy "notes public readable"
on public.notes for select
to anon, authenticated
using (public_slug is not null);
create policy "notes owned readable"
on public.notes for select
to authenticated
using ((select auth.uid()) = user_id);
create policy "notes collaborators readable"
on public.notes for select
to authenticated
using (public.fiip_is_note_collaborator(id, (select auth.uid()), false));
create policy "editor collaborators update shared notes"
on public.notes for update
to authenticated
using (public.fiip_is_note_collaborator(id, (select auth.uid()), true))
with check (
  user_id = public.fiip_note_owner_id(id)
  and public.fiip_is_note_collaborator(id, (select auth.uid()), true)
);
drop policy if exists "Collaborators visible to note owner and collaborators" on public.note_collaborators;
drop policy if exists "Note owners can manage collaborators" on public.note_collaborators;
drop policy if exists "collaborators visible to owners and collaborators" on public.note_collaborators;
drop policy if exists "note owners manage collaborators" on public.note_collaborators;
create policy "collaborators visible to owners and collaborators"
on public.note_collaborators for select
to authenticated
using (
  (select auth.uid()) = user_id
  or public.fiip_is_note_owner(note_id, (select auth.uid()))
);
create policy "note owners manage collaborators"
on public.note_collaborators for all
to authenticated
using (
  public.fiip_plan_level((select auth.uid())) >= 1
  and public.fiip_is_note_owner(note_id, (select auth.uid()))
)
with check (
  public.fiip_plan_level((select auth.uid())) >= 1
  and public.fiip_is_note_owner(note_id, (select auth.uid()))
);
