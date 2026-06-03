import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, ExternalLink, Save } from "lucide-react";

type Opp = {
  id: string; title: string; organization: string; type: string;
  description: string | null; url: string | null; posted_by: string | null;
};

type Submission = {
  id: string; course_id: string; user_id: string; submission_url: string | null;
  notes: string | null; status: string; feedback: string | null;
};

type Lesson = {
  id: string; title: string; course_id: string; video_url: string | null; position: number;
};

type Course = { id: string; title: string; slug: string };

export function AdminDashboard() {
  const [pendingOpps, setPendingOpps] = useState<Opp[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [videoDrafts, setVideoDrafts] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  const loadAll = async () => {
    const [{ data: opps }, { data: subs }, { data: cs }] = await Promise.all([
      supabase.from("opportunities").select("*").eq("status", "pending_approval"),
      supabase.from("project_submissions").select("*").eq("status", "pending"),
      supabase.from("courses").select("id, title, slug").order("title"),
    ]);
    setPendingOpps((opps as Opp[]) ?? []);
    setSubmissions((subs as Submission[]) ?? []);
    setCourses((cs as Course[]) ?? []);
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!selectedCourse) { setLessons([]); return; }
    supabase.from("lessons").select("id, title, course_id, video_url, position")
      .eq("course_id", selectedCourse).order("position").then(({ data }) => {
        setLessons((data as Lesson[]) ?? []);
        const drafts: Record<string, string> = {};
        (data ?? []).forEach((l: any) => { drafts[l.id] = l.video_url ?? ""; });
        setVideoDrafts(drafts);
      });
  }, [selectedCourse]);

  const decideOpp = async (id: string, approve: boolean) => {
    const { error } = await supabase.from("opportunities")
      .update({ status: approve ? "open" : "rejected" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Opportunity approved" : "Opportunity rejected");
    loadAll();
  };

  const decideSubmission = async (s: Submission, approve: boolean) => {
    const { error } = await supabase.from("project_submissions").update({
      status: approve ? "approved" : "rejected",
      feedback: feedbacks[s.id] ?? s.feedback ?? null,
    }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Submission approved" : "Submission rejected");
    loadAll();
  };

  const saveVideo = async (lessonId: string) => {
    const url = videoDrafts[lessonId]?.trim() || null;
    const { error } = await supabase.from("lessons").update({ video_url: url }).eq("id", lessonId);
    if (error) { toast.error(error.message); return; }
    toast.success("Video link saved");
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="opps">
        <TabsList>
          <TabsTrigger value="opps">
            Pending Opportunities {pendingOpps.length > 0 && <Badge className="ml-2">{pendingOpps.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="subs">
            Project Submissions {submissions.length > 0 && <Badge className="ml-2">{submissions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="videos">Course Videos</TabsTrigger>
        </TabsList>

        <TabsContent value="opps" className="mt-6 space-y-3">
          {pendingOpps.length === 0 && <p className="text-muted-foreground">No opportunities awaiting approval.</p>}
          {pendingOpps.map(o => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{o.type}</Badge>
                    <h3 className="font-semibold">{o.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{o.organization}</p>
                  {o.description && <p className="mt-2 text-sm">{o.description}</p>}
                  {o.url && (
                    <a href={o.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      {o.url} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decideOpp(o.id, true)}>
                    <Check className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decideOpp(o.id, false)}>
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="subs" className="mt-6 space-y-3">
          {submissions.length === 0 && <p className="text-muted-foreground">No submissions awaiting review.</p>}
          {submissions.map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">User: {s.user_id.slice(0, 8)}…</p>
                {s.submission_url && (
                  <a href={s.submission_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    View submission <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {s.notes && <p className="mt-2 text-sm whitespace-pre-wrap">{s.notes}</p>}
              </div>
              <Textarea
                placeholder="Feedback (optional)"
                value={feedbacks[s.id] ?? ""}
                onChange={e => setFeedbacks({ ...feedbacks, [s.id]: e.target.value })}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => decideSubmission(s, true)}>
                  <Check className="mr-1 h-4 w-4" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => decideSubmission(s, false)}>
                  <X className="mr-1 h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="videos" className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Course</label>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="mt-1 w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Select a course —</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          {lessons.map(l => (
            <div key={l.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
              <span className="min-w-[180px] text-sm font-medium">{l.position + 1}. {l.title}</span>
              <Input
                value={videoDrafts[l.id] ?? ""}
                onChange={e => setVideoDrafts({ ...videoDrafts, [l.id]: e.target.value })}
                placeholder="https://video-url..."
                className="flex-1 min-w-[200px]"
              />
              <Button size="sm" onClick={() => saveVideo(l.id)}>
                <Save className="mr-1 h-4 w-4" /> Save
              </Button>
            </div>
          ))}
          {selectedCourse && lessons.length === 0 && (
            <p className="text-muted-foreground">No lessons in this course yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
