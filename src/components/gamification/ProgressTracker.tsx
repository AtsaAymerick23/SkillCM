import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen } from "lucide-react";

type Row = { course_id: string; title: string; total: number; done: number };

export function ProgressTracker() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, courses(id,title,slug)")
        .eq("user_id", user.id);

      const courses = (enrollments ?? []).map((e: any) => e.courses).filter(Boolean);
      if (courses.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const ids = courses.map((c: any) => c.id);
      const [{ data: lessons }, { data: progress }] = await Promise.all([
        supabase.from("lessons").select("id, course_id").in("course_id", ids),
        supabase
          .from("lesson_progress")
          .select("lesson_id, course_id, completed")
          .eq("user_id", user.id)
          .in("course_id", ids),
      ]);

      const totals = new Map<string, number>();
      (lessons ?? []).forEach((l: any) => totals.set(l.course_id, (totals.get(l.course_id) ?? 0) + 1));
      const done = new Map<string, number>();
      (progress ?? []).forEach((p: any) => {
        if (p.completed) done.set(p.course_id, (done.get(p.course_id) ?? 0) + 1);
      });

      setRows(
        courses.map((c: any) => ({
          course_id: c.id,
          title: c.title,
          total: totals.get(c.id) ?? 0,
          done: done.get(c.id) ?? 0,
        }))
      );
      setLoading(false);
    })();
  }, [user]);

  const overallTotal = rows.reduce((s, r) => s + r.total, 0);
  const overallDone = rows.reduce((s, r) => s + r.done, 0);
  const overallPct = overallTotal ? Math.round((overallDone / overallTotal) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Learning journey</p>
            <p className="font-display text-2xl font-bold">{overallPct}%</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {overallDone} / {overallTotal} lessons
        </p>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Enroll in a course to start tracking progress.{" "}
            <Link to="/courses" className="text-primary underline">
              Browse courses →
            </Link>
          </p>
        ) : (
          rows.map((r) => {
            const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
            return (
              <div key={r.course_id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate pr-2">{r.title}</span>
                  <span className="text-muted-foreground tabular-nums">{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
