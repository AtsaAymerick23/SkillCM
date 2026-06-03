
REVOKE EXECUTE ON FUNCTION public.record_daily_activity() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_daily_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int, text) TO authenticated;
