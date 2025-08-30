
-- Publieke (rol-onafhankelijke) namen ophalen voor weergave
-- Beperkt tot niet-gevoelige velden
create or replace function public.get_public_profiles(ids uuid[])
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  role text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.first_name, p.last_name, p.avatar_url, p.role
  from public.profiles p
  where p.id = any (ids)
$$;

-- Zorg dat alleen ingelogde gebruikers deze functie kunnen gebruiken
grant execute on function public.get_public_profiles(uuid[]) to authenticated;
