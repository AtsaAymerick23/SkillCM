import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Trophy, Award } from "lucide-react";

type Badge = { id: string; code: string; name: string; description: string | null; icon: string; points: number };

export function PointsBadges() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [points, setPoints] = useState(0);
  const [earned, setEarned] = useState<Badge[]>([]);
  const [all, setAll] = useState<Badge[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: pts }, { data: badges }, { data: ub }] = await Promise.all([
        supabase.from("user_points").select("points").eq("user_id", user.id).maybeSingle(),
        supabase.from("badges").select("*").order("points"),
        supabase.from("user_badges").select("badge_id").eq("user_id", user.id),
      ]);
      setPoints(pts?.points ?? 0);
      setAll((badges as Badge[]) ?? []);
      const earnedIds = new Set((ub ?? []).map((x: any) => x.badge_id));
      setEarned(((badges as Badge[]) ?? []).filter((b) => earnedIds.has(b.id)));
    })();
  }, [user]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-grad-primary">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("gam.points")}</p>
            <p className="font-display text-2xl font-bold">{points}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{earned.length} / {all.length} {t("gam.badges")}</p>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {all.map((b) => {
          const got = earned.some((e) => e.id === b.id);
          return (
            <div key={b.id} title={`${b.name}${b.description ? " — " + b.description : ""}`}
              className={`flex flex-col items-center rounded-xl border p-3 text-center transition ${got ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30 opacity-50"}`}>
              <Award className={`h-6 w-6 ${got ? "text-primary" : "text-muted-foreground"}`} />
              <p className="mt-1 text-[10px] font-medium leading-tight">{b.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
