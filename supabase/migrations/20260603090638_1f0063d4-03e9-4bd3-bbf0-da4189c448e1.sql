
-- 1) Hide correct exam answers from clients
REVOKE SELECT ON public.exam_questions FROM anon, authenticated;
GRANT SELECT (id, exam_id, position, question, options, points, created_at)
  ON public.exam_questions TO authenticated;

-- Server-side exam grading
CREATE OR REPLACE FUNCTION public.submit_exam(p_exam_id uuid, p_answers jsonb)
RETURNS TABLE(attempt_id uuid, score int, passed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_course uuid;
  v_pass int;
  v_total int := 0;
  v_earned int := 0;
  v_score int := 0;
  v_passed boolean := false;
  v_id uuid;
  v_norm jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT course_id, passing_score INTO v_course, v_pass
    FROM public.exams WHERE id = p_exam_id;
  IF v_course IS NULL THEN RAISE EXCEPTION 'Exam not found'; END IF;

  -- Normalize answers into [{question_id, choice}]
  IF jsonb_typeof(p_answers) = 'object' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('question_id', k, 'choice', (v)::int)), '[]'::jsonb)
      INTO v_norm FROM jsonb_each_text(p_answers) AS t(k, v);
  ELSE
    v_norm := p_answers;
  END IF;

  WITH ans AS (
    SELECT (a->>'question_id')::uuid AS qid, NULLIF(a->>'choice','')::int AS choice
      FROM jsonb_array_elements(v_norm) a
  ),
  scored AS (
    SELECT q.points,
           CASE WHEN a.choice = q.correct_index THEN q.points ELSE 0 END AS earned
      FROM public.exam_questions q
      LEFT JOIN ans a ON a.qid = q.id
     WHERE q.exam_id = p_exam_id
  )
  SELECT coalesce(sum(points),0), coalesce(sum(earned),0) INTO v_total, v_earned FROM scored;

  v_score := CASE WHEN v_total > 0 THEN round((v_earned::numeric / v_total) * 100)::int ELSE 0 END;
  v_passed := v_score >= v_pass;

  INSERT INTO public.exam_attempts(exam_id, user_id, course_id, score, passed, answers)
  VALUES (p_exam_id, v_user, v_course, v_score, v_passed, v_norm)
  RETURNING id INTO v_id;

  attempt_id := v_id; score := v_score; passed := v_passed;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_exam(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_exam(uuid, jsonb) TO authenticated;

-- 2) Restrict profiles SELECT to owner; expose safe fields via view
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Users view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, full_name, headline, bio, avatar_url, city, country, skills, primary_role, preferred_language
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 3) Mentor role lookup: authenticated only
DROP POLICY IF EXISTS "Mentor roles are publicly viewable" ON public.user_roles;
CREATE POLICY "Mentor roles viewable by authenticated"
  ON public.user_roles FOR SELECT TO authenticated
  USING (role = 'mentor'::app_role);

-- 4) Lock down internal trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
