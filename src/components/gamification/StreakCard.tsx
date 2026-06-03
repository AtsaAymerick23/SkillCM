import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Flame, Trophy } from "lucide-react";
import { toast } from "sonner";

const MILESTONES = [3, 7, 14, 30, 60, 100];

export function StreakCard() {
  const { user } = useAuth();
  const [current, setCurrent] = useState(0);
  const [longest, setLongest] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Record today's activity (server enforces idempotency)
      const { data: act } = await (supabase as any).rpc("record_daily_activity");
      const row = Array.isArray(act) ? act[0] : act;
      if (row) {
        setCurrent(row.current_streak ?? 0);
        setLongest(row.longest_streak ?? 0);
        if (row.milestone_awarded) {
          toast.success(`🔥 ${row.milestone_awarded}`, {
            description: "Milestone badge unlocked!",
          });
        }
      } else {
        const { data } = await (supabase as any)
          .from("user_points")
          .select("current_streak,longest_streak")
          .eq("user_id", user.id)
          .maybeSingle();
        setCurrent(data?.current_streak ?? 0);
        setLongest(data?.longest_streak ?? 0);
      }
    })();
  }, [user]);

  const nextMilestone = MILESTONES.find((m) => m > current) ?? current;
  const prev = [...MILESTONES].reverse().find((m) => m <= current) ?? 0;
  const pct = Math.min(100, Math.round(((current - prev) / Math.max(1, nextMilestone - prev)) * 100));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
            <Flame className="h-6 w-6 text-accent" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current streak</p>
            <p className="font-display text-2xl font-bold">{current} <span className="text-sm font-normal text-muted-foreground">days</span></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1 justify-end">
            <Trophy className="h-3 w-3" /> Longest
          </p>
          <p className="font-display text-xl font-semibold">{longest}d</p>
        </div>
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{prev}d</span>
          <span>Next reward at {nextMilestone}d</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-accent to-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Sign in daily to keep your streak alive 🔥
        </p>
      </div>
    </div>
  );
}
