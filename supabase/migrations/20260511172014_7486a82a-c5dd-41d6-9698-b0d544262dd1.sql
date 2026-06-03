-- EXAMS
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE,
  title text NOT NULL,
  passing_score int NOT NULL DEFAULT 70,
  time_limit_minutes int NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exams viewable when course visible" ON public.exams FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = exams.course_id AND (c.published OR c.instructor_id = auth.uid() OR has_role(auth.uid(),'admin'))));

CREATE POLICY "Course owners/admins manage exams" ON public.exams FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = exams.course_id AND (c.instructor_id = auth.uid() OR has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = exams.course_id AND (c.instructor_id = auth.uid() OR has_role(auth.uid(),'admin'))));

CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EXAM QUESTIONS
CREATE TABLE public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  position int NOT NULL DEFAULT 0,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index int NOT NULL DEFAULT 0,
  points int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exam questions viewable when exam visible" ON public.exam_questions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM exams e JOIN courses c ON c.id = e.course_id WHERE e.id = exam_questions.exam_id AND (c.published OR c.instructor_id = auth.uid() OR has_role(auth.uid(),'admin'))));

CREATE POLICY "Course owners/admins manage exam questions" ON public.exam_questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM exams e JOIN courses c ON c.id = e.course_id WHERE e.id = exam_questions.exam_id AND (c.instructor_id = auth.uid() OR has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM exams e JOIN courses c ON c.id = e.course_id WHERE e.id = exam_questions.exam_id AND (c.instructor_id = auth.uid() OR has_role(auth.uid(),'admin'))));

-- EXAM ATTEMPTS
CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  score int NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own attempts or owners" ON public.exam_attempts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM courses c WHERE c.id = exam_attempts.course_id AND c.instructor_id = auth.uid()));

CREATE POLICY "Users insert own attempts" ON public.exam_attempts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- PROJECTS
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  rubric text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects viewable when course visible" ON public.projects FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = projects.course_id AND (c.published OR c.instructor_id = auth.uid() OR has_role(auth.uid(),'admin'))));

CREATE POLICY "Course owners/admins manage projects" ON public.projects FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = projects.course_id AND (c.instructor_id = auth.uid() OR has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = projects.course_id AND (c.instructor_id = auth.uid() OR has_role(auth.uid(),'admin'))));

CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROJECT SUBMISSIONS
CREATE TABLE public.project_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  course_id uuid NOT NULL,
  user_id uuid NOT NULL,
  submission_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewer_id uuid,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or as course owner" ON public.project_submissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM courses c WHERE c.id = project_submissions.course_id AND c.instructor_id = auth.uid()));

CREATE POLICY "Users submit own" ON public.project_submissions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners/admins/self update" ON public.project_submissions FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM courses c WHERE c.id = project_submissions.course_id AND c.instructor_id = auth.uid()));

CREATE POLICY "Users delete own pending" ON public.project_submissions FOR DELETE TO authenticated
USING (user_id = auth.uid() AND status = 'pending');

CREATE TRIGGER trg_psub_updated BEFORE UPDATE ON public.project_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CERTIFICATES: link to exam/project
ALTER TABLE public.certificates
  ADD COLUMN exam_attempt_id uuid,
  ADD COLUMN project_submission_id uuid;

-- Tighten issue policy: lessons complete + passed exam (if exists) + approved project (if exists)
DROP POLICY IF EXISTS "Users issue own certificate after completion" ON public.certificates;

CREATE POLICY "Users issue certificate after exam and project"
ON public.certificates FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM lessons l
    WHERE l.course_id = certificates.course_id
    AND NOT EXISTS (
      SELECT 1 FROM lesson_progress lp
      WHERE lp.lesson_id = l.id AND lp.user_id = auth.uid() AND lp.completed = true
    )
  )
  AND (
    NOT EXISTS (SELECT 1 FROM exams e WHERE e.course_id = certificates.course_id)
    OR EXISTS (SELECT 1 FROM exam_attempts a WHERE a.course_id = certificates.course_id AND a.user_id = auth.uid() AND a.passed = true)
  )
  AND (
    NOT EXISTS (SELECT 1 FROM projects p WHERE p.course_id = certificates.course_id)
    OR EXISTS (SELECT 1 FROM project_submissions s WHERE s.course_id = certificates.course_id AND s.user_id = auth.uid() AND s.status = 'approved')
  )
);