import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Clock, CheckCircle2, XCircle } from "lucide-react";

type Exam = { id: string; course_id: string; title: string; passing_score: number; time_limit_minutes: number };
type Question = { id: string; position: number; question: string; options: string[]; points: number };
type Attempt = { id: string; score: number; passed: boolean; submitted_at: string };

export default function ExamPage() {
  const { slug } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [bestAttempt, setBestAttempt] = useState<Attempt | null>(null);
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  useEffect(() => {
    if (!slug || !user) return;
    (async () => {
      const { data: c } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
      if (!c) return;
      setCourse(c);
      const { data: e } = await supabase.from("exams").select("*").eq("course_id", c.id).maybeSingle();
      if (!e) return;
      setExam(e as Exam);
      const { data: qs } = await supabase
        .from("exam_questions")
        .select("id, position, question, options, points")
        .eq("exam_id", e.id)
        .order("position");
      setQuestions((qs ?? []) as any);
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("id, score, passed, submitted_at")
        .eq("exam_id", e.id)
        .eq("user_id", user.id)
        .order("score", { ascending: false })
        .limit(1);
      setBestAttempt(attempts?.[0] ?? null);
    })();
  }, [slug, user]);

  useEffect(() => {
    if (!started || !exam) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(t); submit(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, exam]);

  const start = () => {
    if (!exam) return;
    setAnswers({});
    setResult(null);
    setRemaining(exam.time_limit_minutes * 60);
    setStarted(true);
  };

  const submit = async () => {
    if (!exam || !user || submitting) return;
    setSubmitting(true);
    const payload = questions.map((q) => ({ question_id: q.id, choice: answers[q.id] ?? null }));
    const { data, error } = await supabase.rpc("submit_exam", {
      p_exam_id: exam.id,
      p_answers: payload as any,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    const score = row?.score ?? 0;
    const passed = !!row?.passed;
    setStarted(false);
    setResult({ score, passed });
    setBestAttempt({ id: "new", score, passed, submitted_at: new Date().toISOString() });
    if (passed) toast.success("Passed!"); else toast.error("Did not pass — try again.");
  };

  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");

  if (!course) {
    return <div className="min-h-screen bg-background"><SiteHeader /><main className="container py-20 text-muted-foreground">Loading…</main><SiteFooter /></div>;
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold">No exam for this course</h1>
          <Button asChild className="mt-6" variant="outline"><Link to={`/courses/${slug}`}><ArrowLeft className="mr-1 h-4 w-4" />Back</Link></Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        <Link to={`/courses/${slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />Back to course
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold md:text-4xl">{exam.title}</h1>
          {started && (
            <Badge variant="outline" className="text-base">
              <Clock className="mr-1 h-4 w-4" />{minutes}:{seconds}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-muted-foreground">
          Passing score: <span className="font-semibold text-foreground">{exam.passing_score}%</span> · Time limit: {exam.time_limit_minutes} min · {questions.length} questions
        </p>

        {bestAttempt && !started && (
          <div className={`mt-6 rounded-2xl border p-5 ${bestAttempt.passed ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
            <div className="flex items-center gap-2">
              {bestAttempt.passed ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
              <span className="font-semibold">Best score: {bestAttempt.score}%</span>
              <Badge variant={bestAttempt.passed ? "default" : "secondary"}>{bestAttempt.passed ? "Passed" : "Not passed"}</Badge>
            </div>
          </div>
        )}

        {result && (
          <div className={`mt-6 rounded-2xl border p-5 ${result.passed ? "border-primary/50 bg-primary/5" : "border-destructive/50 bg-destructive/5"}`}>
            <div className="text-lg font-display font-semibold">
              {result.passed ? "🎉 You passed!" : "Keep going — try again"}
            </div>
            <div className="text-sm text-muted-foreground">Your score: {result.score}%</div>
          </div>
        )}

        {!started ? (
          <Button onClick={start} className="mt-8 bg-grad-primary" disabled={questions.length === 0}>
            {bestAttempt ? "Retake exam" : "Start exam"}
          </Button>
        ) : (
          <div className="mt-8 space-y-5">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="font-medium">{i + 1}. {q.question}</div>
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, idx) => (
                    <label key={idx} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === idx}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={submit} disabled={submitting} className="bg-grad-primary">
              {submitting ? "Submitting…" : "Submit exam"}
            </Button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
