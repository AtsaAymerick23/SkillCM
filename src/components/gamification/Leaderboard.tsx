import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Medal, Trophy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Row = {
  user_id: string;
  full_name: string;
  region: string | null;
  points: number;
  current_streak: number;
  longest_streak: number;
};

export function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [optedIn, setOptedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: lb }, { data: me }] = await Promise.all([
      (supabase as any).rpc("get_leaderboard", { p_limit: 25 }),
      user
        ? (supabase as any)
            .from("user_points")
            .select("leaderboard_opt_in")
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setRows((lb as Row[]) ?? []);
    setOptedIn(!!me?.leaderboard_opt_in);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleOptIn = async () => {
    if (!user) return;
    const next = !optedIn;
    const { error } = await (supabase as any)
      .from("user_points")
      .upsert(
        { user_id: user.id, leaderboard_opt_in: next },
        { onConflict: "user_id" }
      );
    if (error) {
      toast.error("Could not update preference");
      return;
    }
    setOptedIn(next);
    toast.success(next ? "You're on the leaderboard 🏆" : "Removed from leaderboard");
    load();
  };

  const medal = (i: number) => {
    if (i === 0) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (i === 1) return <Medal className="h-4 w-4 text-slate-400" />;
    if (i === 2) return <Medal className="h-4 w-4 text-amber-700" />;
    return <span className="text-xs text-muted-foreground tabular-nums w-4 text-center">{i + 1}</span>;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-grad-primary">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Community</p>
            <p className="font-display text-xl font-bold">Leaderboard</p>
          </div>
        </div>
        <Button size="sm" variant={optedIn ? "secondary" : "outline"} onClick={toggleOptIn}>
          {optedIn ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
          {optedIn ? "Opt out" : "Join"}
        </Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No participants yet. Be the first — click "Join" to opt in.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r, i) => (
              <li
                key={r.user_id}
                className={`flex items-center gap-3 py-2.5 ${
                  user?.id === r.user_id ? "bg-primary/5 -mx-2 px-2 rounded-md" : ""
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center">{medal(i)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.full_name}
                    {user?.id === r.user_id && <span className="ml-1 text-xs text-primary">(you)</span>}
                  </p>
                  {r.region && (
                    <p className="text-xs text-muted-foreground truncate">{r.region}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{r.points} pts</p>
                  <p className="text-xs text-muted-foreground">🔥 {r.current_streak}d</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
