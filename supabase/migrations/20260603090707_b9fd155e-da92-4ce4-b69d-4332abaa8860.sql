
DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE FUNCTION public.get_public_profiles(user_ids uuid[])
RETURNS TABLE(
  id uuid,
  full_name text,
  headline text,
  bio text,
  avatar_url text,
  city text,
  country text,
  skills text[],
  primary_role app_role,
  preferred_language text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, headline, bio, avatar_url, city, country, skills, primary_role, preferred_language
    FROM public.profiles
   WHERE id = ANY(user_ids);
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;

-- Lock has_role to authenticated only (still callable from RLS as policies run with caller privileges)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
