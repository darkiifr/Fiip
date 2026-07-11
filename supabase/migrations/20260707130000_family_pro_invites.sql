-- Family Pro invitations and membership completion.

alter table public.family_members
  alter column user_id drop not null,
  add column if not exists invite_token text,
  add column if not exists invited_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists expires_at timestamp with time zone,
  add column if not exists accepted_at timestamp with time zone,
  add column if not exists removed_at timestamp with time zone;

create unique index if not exists family_members_invite_token_idx
on public.family_members(invite_token)
where invite_token is not null;

create index if not exists family_members_invited_email_idx
on public.family_members(lower(invited_email))
where invited_email is not null;

drop index if exists family_members_one_active_user_per_group_idx;
create unique index family_members_one_active_user_per_group_idx
on public.family_members(family_group_id, user_id)
where user_id is not null and status <> 'removed';

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
