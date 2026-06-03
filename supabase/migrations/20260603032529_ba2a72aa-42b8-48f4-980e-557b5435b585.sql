
CREATE POLICY "Users self-assign non-admin role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role IN ('student'::app_role, 'mentor'::app_role));

CREATE POLICY "Users delete own non-admin role"
ON public.user_roles
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND role IN ('student'::app_role, 'mentor'::app_role));
