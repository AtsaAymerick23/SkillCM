
ALTER TABLE public.user_points
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date date,
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS region text;

CREATE OR REPLACE FUNCTION public.record_daily_activity()
RETURNS TABLE(current_streak int, longest_streak int, points int, milestone_awarded text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'UTC')::date;
  v_last date;
  v_cur int;
  v_long int;
  v_pts int;
  v_milestone text := NULL;
  v_badge_code text := NULL;
  v_badge_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.user_points(user_id, points, current_streak, longest_streak, last_activity_date)
  VALUES (v_user, 0, 1, 1, v_today)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT up.last_activity_date, up.current_streak, up.longest_streak, up.points
    INTO v_last, v_cur, v_long, v_pts
  FROM public.user_points up WHERE up.user_id = v_user;

  IF v_last = v_today THEN
    -- already counted today
    NULL;
  ELSIF v_last = v_today - INTERVAL '1 day' THEN
    v_cur := v_cur + 1;
    v_pts := v_pts + 5;
  ELSE
    v_cur := 1;
    v_pts := v_pts + 5;
  END IF;

  IF v_cur > v_long THEN v_long := v_cur; END IF;

  UPDATE public.user_points
     SET current_streak = v_cur,
         longest_streak = v_long,
         last_activity_date = v_today,
         points = v_pts,
         updated_at = now()
   WHERE user_id = v_user;

  -- milestone badges
  IF v_cur = 3 THEN v_badge_code := 'streak_3'; v_milestone := '3-day streak!';
  ELSIF v_cur = 7 THEN v_badge_code := 'streak_7'; v_milestone := '7-day streak!';
  ELSIF v_cur = 30 THEN v_badge_code := 'streak_30'; v_milestone := '30-day streak!';
  ELSIF v_cur = 100 THEN v_badge_code := 'streak_100'; v_milestone := '100-day streak!';
  END IF;

  IF v_badge_code IS NOT NULL THEN
    SELECT id INTO v_badge_id FROM public.badges WHERE code = v_badge_code;
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges(user_id, badge_id)
      VALUES (v_user, v_badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY SELECT v_cur, v_long, v_pts, v_milestone;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit int DEFAULT 50, p_region text DEFAULT NULL)
RETURNS TABLE(user_id uuid, full_name text, region text, points int, current_streak int, longest_streak int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.user_id,
         coalesce(p.full_name, 'Anonymous') as full_name,
         coalesce(up.region, p.city) as region,
         up.points,
         up.current_streak,
         up.longest_streak
  FROM public.user_points up
  LEFT JOIN public.profiles p ON p.id = up.user_id
  WHERE up.leaderboard_opt_in = true
    AND (p_region IS NULL OR coalesce(up.region, p.city) = p_region)
  ORDER BY up.points DESC, up.longest_streak DESC
  LIMIT p_limit;
$$;

-- Unique constraint for badge awards (idempotency)
DO $$ BEGIN
  ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_badge_unique UNIQUE(user_id, badge_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
