-- Extend the public note RPC with a minimal public author profile.
-- Do not expose email or private account/license metadata.

drop function if exists public.get_public_note_by_slug(text);

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
  author_username text,
  author_avatar_url text,
  author_bio text,
  author_accent_color text
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
    coalesce(p.nickname, p.username, 'Utilisateur Fiip') as author_username,
    nullif(p.avatar_url, '') as author_avatar_url,
    nullif(p.bio, '') as author_bio,
    coalesce(nullif(p.accent_color, ''), '#D97706') as author_accent_color
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
