-- Attach trigger to auth.users so handle_new_user runs on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (id, full_name, preferred_language)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', u.email),
       COALESCE(u.raw_user_meta_data->>'preferred_language', 'en')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Backfill missing roles based on signup_role metadata (default student)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
       CASE WHEN u.raw_user_meta_data->>'signup_role' IN ('mentor','student')
            THEN (u.raw_user_meta_data->>'signup_role')::public.app_role
            ELSE 'student'::public.app_role
       END
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;