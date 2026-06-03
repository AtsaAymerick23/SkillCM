import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

type Project = { id: string; course_id: string; title: string; description: string | null; rubric: string | null };
type Submission = {
  id: string; user_id: string; submission_url: string | null; notes: string | null;
  status: string; feedback: string | null; created_at: string;
};

export default function ProjectPage() {
  const { slug } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [mine, setMine] = useState<Submission | null>(null);
  const [pending, setPending] = useState<(Submission & { full_name?: string })[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  const load = async () => {
    if (!slug || !user) return;
    const { data: c } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
    if (!c) return;
    setCourse(c);
    setIsOwner(c.instructor_id === user.id);
    const { data: p } = await supabase.from("projects").select("*").eq("course_id", c.id).maybeSingle();
    if (!p) return;
    setProject(p as Project);
    const { data: ms } = await supabase
      .from("project_submissions")
      .select("*")
      .eq("project_id", p.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    setMine((ms?.[0] as any) ?? null);
    if (c.instructor_id === user.id) {
      const { data: subs } = await supabase
        .from("project_submissions")
        .select("*")
        .eq("project_id", p.id)
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((subs ?? []).map((s: any) => s.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.rpc("get_public_profiles", { user_ids: ids })
        : { data: [] as any[] };
      setPending((subs ?? []).map((s: any) => ({
        ...s,
        full_name: profiles?.find((p) => p.id === s.user_id)?.full_name ?? "Learner",
      })));
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug, user]);

  const submit = async () => {
    if (!project || !user) return;
    setBusy(true);
    const { error } = await supabase.from("project_submissions").insert({
      project_id: project.id,
      course_id: project.course_id,
      user_id: user.id,
      submission_url: url || null,
      notes: notes || null,
      status: "pending",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted for review");
    setUrl(""); setNotes("");
    load();
  };

  const review = async (id: string, status: "approved" | "rejected", feedback?: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("project_submissions")
      .update({ status, reviewer_id: user.id, feedback: feedback ?? null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };

  if (!course) {
    return <div className="min-h-screen bg-background"><SiteHeader /><main className="container py-20 text-muted-foreground">Loading…</main><SiteFooter /></div>;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold">No project for this course</h1>
          <Button asChild className="mt-6" variant="outline"><Link to={`/courses/${slug}`}><ArrowLeft className="mr-1 h-4 w-4" />Back</Link></Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-primary text-primary-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Approved</Badge>;
    if (s === "rejected") return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
    return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        <Link to={`/courses/${slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />Back to course
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">{project.title}</h1>
        {project.description && <p className="mt-3 text-muted-foreground">{project.description}</p>}
        {project.rubric && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Rubric</div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{project.rubric}</p>
          </div>
        )}

        {!isOwner && (
          <section className="mt-10 grid gap-6 md:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-xl font-semibold">Submit your project</h2>
              <div className="mt-4 space-y-3">
                <Input placeholder="Submission URL (GitHub, Drive, etc.)" value={url} onChange={(e) => setUrl(e.target.value)} />
                <Textarea placeholder="Notes for the reviewer (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
                <Button onClick={submit} disabled={busy || !url} className="bg-grad-primary">
                  {busy ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </div>
            <aside className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm text-muted-foreground">Your latest submission</div>
              {mine ? (
                <div className="mt-3 space-y-2">
                  {statusBadge(mine.status)}
                  {mine.submission_url && <a className="block break-all text-sm text-primary hover:underline" href={mine.submission_url} target="_blank" rel="noreferrer">{mine.submission_url}</a>}
                  {mine.feedback && <p className="rounded-lg bg-muted p-3 text-xs">{mine.feedback}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(mine.created_at).toLocaleString()}</p>
                </div>
              ) : <p className="mt-3 text-sm text-muted-foreground">No submission yet.</p>}
            </aside>
          </section>
        )}

        {isOwner && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold">Submissions ({pending.length})</h2>
            <div className="mt-4 space-y-3">
              {pending.map((s) => (
                <ReviewRow key={s.id} sub={s} onReview={review} />
              ))}
              {pending.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ReviewRow({ sub, onReview }: { sub: any; onReview: (id: string, s: "approved" | "rejected", fb?: string) => void }) {
  const [fb, setFb] = useState(sub.feedback ?? "");
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">{sub.full_name}</div>
          {sub.submission_url && <a className="text-xs text-primary hover:underline break-all" href={sub.submission_url} target="_blank" rel="noreferrer">{sub.submission_url}</a>}
        </div>
        <Badge variant={sub.status === "approved" ? "default" : sub.status === "rejected" ? "destructive" : "secondary"}>{sub.status}</Badge>
      </div>
      {sub.notes && <p className="mt-2 text-sm text-muted-foreground">{sub.notes}</p>}
      <Textarea placeholder="Feedback" value={fb} onChange={(e) => setFb(e.target.value)} className="mt-3" rows={2} />
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => onReview(sub.id, "approved", fb)} className="bg-grad-primary">Approve</Button>
        <Button size="sm" variant="outline" onClick={() => onReview(sub.id, "rejected", fb)}>Reject</Button>
      </div>
    </div>
  );
}
