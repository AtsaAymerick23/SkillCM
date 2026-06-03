import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, PlayCircle, Clock, Award, FileCheck, GraduationCap, Lock } from "lucide-react";
import { toast } from "sonner";

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [hasExam, setHasExam] = useState(false);
  const [examPassed, setExamPassed] = useState(false);
  const [hasProject, setHasProject] = useState(false);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [certificateCode, setCertificateCode] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!c) return;
      setCourse(c);
      const { data: ls } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", c.id)
        .order("position");
      setLessons(ls ?? []);

      if (user) {
        const { data: e } = await supabase
          .from("enrollments").select("id").eq("course_id", c.id).eq("user_id", user.id).maybeSingle();
        setEnrolled(!!e);
        const { data: p } = await supabase
          .from("lesson_progress").select("lesson_id, completed").eq("course_id", c.id).eq("user_id", user.id);
        const map: Record<string, boolean> = {};
        p?.forEach((row) => (map[row.lesson_id] = row.completed));
        setProgress(map);

        const { data: ex } = await supabase.from("exams").select("id").eq("course_id", c.id).maybeSingle();
        setHasExam(!!ex);
        if (ex) {
          const { data: passed } = await supabase.from("exam_attempts")
            .select("id").eq("course_id", c.id).eq("user_id", user.id).eq("passed", true).limit(1);
          setExamPassed((passed?.length ?? 0) > 0);
        }
        const { data: pr } = await supabase.from("projects").select("id").eq("course_id", c.id).maybeSingle();
        setHasProject(!!pr);
        if (pr) {
          const { data: sub } = await supabase.from("project_submissions")
            .select("status").eq("course_id", c.id).eq("user_id", user.id)
            .order("created_at", { ascending: false }).limit(1);
          setProjectStatus(sub?.[0]?.status ?? null);
        }
        const { data: cert } = await supabase.from("certificates")
          .select("code").eq("course_id", c.id).eq("user_id", user.id).maybeSingle();
        setCertificateCode(cert?.code ?? null);
      }
    })();
  }, [slug, user]);

  const enroll = async () => {
    if (!user) return navigate("/auth");
    const { error } = await supabase
      .from("enrollments")
      .insert({ user_id: user.id, course_id: course.id });
    if (error) toast.error(error.message);
    else {
      setEnrolled(true);
      toast.success(t("course.enrolled"));
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container py-20 text-muted-foreground">Loading…</main>
        <SiteFooter />
      </div>
    );
  }

  const completed = lessons.filter((l) => progress[l.id]).length;
  const pct = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-12">
        <Link to="/courses" className="text-sm text-muted-foreground hover:text-foreground">
          ← {t("course.back")}
        </Link>
        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="animate-fade-up">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-secondary/30 text-foreground">{course.category}</Badge>
              <Badge variant="outline">{t(`courses.${course.level}`)}</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-5xl">
              {lang === "fr" ? course.title_fr ?? course.title : course.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {lang === "fr" ? course.description_fr ?? course.description : course.description}
            </p>

            <h2 className="mt-10 font-display text-2xl font-semibold">{t("course.curriculum")}</h2>
            <ol className="mt-4 space-y-3">
              {lessons.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    {progress[l.id] ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <PlayCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">
                        {l.position}. {lang === "fr" ? l.title_fr ?? l.title : l.title}
                      </div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {l.duration_minutes} min
                      </div>
                    </div>
                  </div>
                  {enrolled && (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/courses/${slug}/lessons/${l.id}`}>{t("course.open")}</Link>
                    </Button>
                  )}
                </li>
              ))}
            </ol>

            {enrolled && (hasExam || hasProject) && (
              <div className="mt-10">
                <h2 className="font-display text-2xl font-semibold">Certification requirements</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {hasExam && (
                    <Link to={`/courses/${slug}/exam`} className="group rounded-2xl border border-border bg-card p-5 transition hover:shadow-soft">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-grad-primary text-primary-foreground">
                          <GraduationCap className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="font-display font-semibold group-hover:text-primary">Final exam</div>
                          <div className="text-xs text-muted-foreground">Multiple-choice · timed</div>
                        </div>
                        <div className="ml-auto">
                          {examPassed
                            ? <Badge className="bg-primary text-primary-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Passed</Badge>
                            : <Badge variant="secondary">Pending</Badge>}
                        </div>
                      </div>
                    </Link>
                  )}
                  {hasProject && (
                    <Link to={`/courses/${slug}/project`} className="group rounded-2xl border border-border bg-card p-5 transition hover:shadow-soft">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-grad-primary text-primary-foreground">
                          <FileCheck className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="font-display font-semibold group-hover:text-primary">Capstone project</div>
                          <div className="text-xs text-muted-foreground">Reviewed by instructor</div>
                        </div>
                        <div className="ml-auto">
                          {projectStatus === "approved"
                            ? <Badge className="bg-primary text-primary-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Approved</Badge>
                            : projectStatus === "rejected"
                              ? <Badge variant="destructive">Rejected</Badge>
                              : projectStatus === "pending"
                                ? <Badge variant="secondary">In review</Badge>
                                : <Badge variant="outline">Not submitted</Badge>}
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="text-sm text-muted-foreground">{t("course.progress")}</div>
              <Progress value={pct} className="mt-3" />
              <div className="mt-2 text-xs text-muted-foreground">{completed} / {lessons.length} • {pct}%</div>
              {!enrolled ? (
                <Button onClick={enroll} className="mt-5 w-full bg-grad-primary">
                  {t("course.enroll")}
                </Button>
              ) : (
                lessons[0] && (
                  <Button asChild className="mt-5 w-full bg-grad-primary">
                    <Link to={`/courses/${slug}/lessons/${lessons[0].id}`}>{t("course.continue")}</Link>
                  </Button>
                )
              )}
            </div>

            {enrolled && (() => {
              const lessonsDone = lessons.length > 0 && completed === lessons.length;
              const examOk = !hasExam || examPassed;
              const projectOk = !hasProject || projectStatus === "approved";
              const eligible = lessonsDone && examOk && projectOk;
              if (certificateCode) {
                return (
                  <div className="rounded-2xl border-2 border-primary/50 bg-primary/5 p-6 shadow-soft">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <div className="font-display font-semibold">Certificate issued</div>
                    </div>
                    <Button asChild className="mt-4 w-full bg-grad-primary">
                      <Link to={`/certificates/${certificateCode}`}>View certificate</Link>
                    </Button>
                  </div>
                );
              }
              return (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <div className="flex items-center gap-2">
                    {eligible ? <Award className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                    <div className="font-display font-semibold">Certificate</div>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <li>{lessonsDone ? "✓" : "○"} All lessons completed</li>
                    {hasExam && <li>{examPassed ? "✓" : "○"} Exam passed</li>}
                    {hasProject && <li>{projectOk ? "✓" : "○"} Project approved</li>}
                  </ul>
                  <Button
                    disabled={!eligible || issuing}
                    onClick={async () => {
                      if (!user) return;
                      setIssuing(true);
                      const { data, error } = await supabase
                        .from("certificates")
                        .insert({ user_id: user.id, course_id: course.id })
                        .select("code").maybeSingle();
                      setIssuing(false);
                      if (error) { toast.error(error.message); return; }
                      if (data?.code) {
                        setCertificateCode(data.code);
                        toast.success("Certificate issued!");
                      }
                    }}
                    className="mt-4 w-full bg-grad-primary"
                  >
                    {issuing ? "Issuing…" : eligible ? "Claim certificate" : "Locked"}
                  </Button>
                </div>
              );
            })()}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
