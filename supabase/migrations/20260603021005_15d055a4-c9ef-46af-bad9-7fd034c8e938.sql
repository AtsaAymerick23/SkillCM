CREATE TABLE public.startup_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('business_plan','roadmap','profit_planner')),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.startup_projects TO authenticated;
GRANT ALL ON public.startup_projects TO service_role;

ALTER TABLE public.startup_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners or admins view startup projects"
ON public.startup_projects FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own startup projects"
ON public.startup_projects FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners update startup projects"
ON public.startup_projects FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Owners delete startup projects"
ON public.startup_projects FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER set_startup_projects_updated_at
BEFORE UPDATE ON public.startup_projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_startup_projects_user ON public.startup_projects(user_id, created_at DESC);