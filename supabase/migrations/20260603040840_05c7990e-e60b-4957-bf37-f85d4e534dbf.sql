CREATE POLICY "Mentor roles are publicly viewable"
ON public.user_roles
FOR SELECT
TO authenticated, anon
USING (role = 'mentor'::app_role);