CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  desired_role public.app_role;
  meta_role text;
begin
  insert into public.profiles (id, full_name, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'en')
  );

  meta_role := new.raw_user_meta_data ->> 'signup_role';
  if meta_role in ('mentor', 'student') then
    desired_role := meta_role::public.app_role;
  else
    desired_role := 'student'::public.app_role;
  end if;

  insert into public.user_roles (user_id, role) values (new.id, desired_role);
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Employers/admins can post opportunities" ON public.opportunities;

CREATE POLICY "Authorized users can post opportunities"
ON public.opportunities
FOR INSERT
TO authenticated
WITH CHECK (
  posted_by = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'employer'::app_role)
    OR (has_role(auth.uid(), 'mentor'::app_role) AND status = 'pending_approval')
  )
);

DROP POLICY IF EXISTS "Open opportunities viewable by authenticated" ON public.opportunities;

CREATE POLICY "Open opportunities viewable by authenticated"
ON public.opportunities
FOR SELECT
TO authenticated
USING (
  status = 'open'
  OR posted_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE TABLE public.mentor_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  cadet_id uuid NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  scheduled_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_bookings TO authenticated;
GRANT ALL ON public.mentor_bookings TO service_role;

ALTER TABLE public.mentor_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view bookings"
ON public.mentor_bookings FOR SELECT TO authenticated
USING (cadet_id = auth.uid() OR mentor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Cadets create bookings"
ON public.mentor_bookings FOR INSERT TO authenticated
WITH CHECK (cadet_id = auth.uid());

CREATE POLICY "Participants update bookings"
ON public.mentor_bookings FOR UPDATE TO authenticated
USING (cadet_id = auth.uid() OR mentor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Cadets delete pending bookings"
ON public.mentor_bookings FOR DELETE TO authenticated
USING (cadet_id = auth.uid() AND status = 'pending');

CREATE TRIGGER set_mentor_bookings_updated_at
BEFORE UPDATE ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();