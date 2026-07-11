-- Selectable account licenses and safer public note reads.

alter table public.profiles
  add column if not exists active_license_id uuid references public.licenses(id) on delete set null;

create index if not exists profiles_active_license_idx on public.profiles(active_license_id);

drop policy if exists "notes public or owned readable" on public.notes;
drop policy if exists "notes owned readable" on public.notes;

create policy "notes owned readable"
on public.notes for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.get_public_note_by_slug(p_slug text)
returns table (
  id uuid,
  title text,
  content text,
  attachments jsonb,
  tags jsonb,
  badges jsonb,
  public_slug text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  is_favorite boolean,
  author_username text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    n.id,
    n.title,
    n.content,
    coalesce(n.attachments, '[]'::jsonb) as attachments,
    coalesce(n.tags, '[]'::jsonb) as tags,
    coalesce(n.badges, '[]'::jsonb) as badges,
    n.public_slug,
    n.created_at,
    n.updated_at,
    coalesce(n.is_favorite, false) as is_favorite,
    coalesce(p.nickname, p.username, 'Utilisateur Fiip') as author_username
  from public.notes n
  left join public.profiles p on p.id = n.user_id
  where n.public_slug = p_slug
    and n.public_slug is not null
    and coalesce(n.deleted, false) = false
    and coalesce(n.is_locked, false) = false
    and nullif(n.encrypted_content, '') is null
  limit 1;
$$;

revoke all on function public.get_public_note_by_slug(text) from public;
grant execute on function public.get_public_note_by_slug(text) to anon, authenticated;

create or replace function public.fiip_active_license(p_user_id uuid)
returns public.licenses
language sql
security invoker
stable
set search_path = public
as $$
  select l
  from public.licenses l
  left join public.profiles p on p.id = p_user_id
  where l.user_id = p_user_id
    and l.status = 'active'
    and (l.expires_at is null or l.expires_at > timezone('utc'::text, now()))
  order by
    case when l.id = p.active_license_id then 0 else 1 end,
    l.updated_at desc
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
  select l.id, l.ocr_limit, l.ocr_scans_used
  into v_license_id, v_limit, v_used
  from public.licenses l
  left join public.profiles p on p.id = (select auth.uid())
  where l.user_id = (select auth.uid())
    and l.status = 'active'
    and (l.expires_at is null or l.expires_at > timezone('utc'::text, now()))
  order by
    case when l.id = p.active_license_id then 0 else 1 end,
    l.updated_at desc
  limit 1
  for update of l;

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

grant execute on function public.fiip_try_consume_ocr_scan() to authenticated;
