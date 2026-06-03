import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  WifiOff,
  CloudUpload,
  Video,
  Trash2,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { AITutor } from "@/components/AITutor";
import {
  downloadVideo,
  getCachedVideoUrl,
  isVideoCached,
  removeCachedVideo,
  formatBytes,
  listCachedVideos,
} from "@/lib/offlineVideo";

const LS_OFFLINE_KEY = "lesson_offline_v1";
const LS_PENDING_KEY = "lesson_progress_pending_v1";

type OfflineEntry = {
  title: string;
  content: string;
  videoUrl?: string | null;
  attachmentUrl?: string | null;
  savedAt: number;
};
type PendingProgress = {
  user_id: string;
  lesson_id: string;
  course_id: string;
  last_position_seconds: number;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
};

const getOfflineStore = (): Record<string, OfflineEntry> => {
  try { return JSON.parse(localStorage.getItem(LS_OFFLINE_KEY) || "{}"); } catch { return {}; }
};
const setOffline = (id: string, entry: OfflineEntry) => {
  const store = getOfflineStore();
  store[id] = entry;
  localStorage.setItem(LS_OFFLINE_KEY, JSON.stringify(store));
};
const getPending = (): PendingProgress[] => {
  try { return JSON.parse(localStorage.getItem(LS_PENDING_KEY) || "[]"); } catch { return []; }
};
const setPending = (p: PendingProgress[]) =>
  localStorage.setItem(LS_PENDING_KEY, JSON.stringify(p));

const queueProgress = (entry: PendingProgress) => {
  const all = getPending().filter((p) => p.lesson_id !== entry.lesson_id);
  all.push(entry);
  setPending(all);
};

async function flushPending() {
  if (!navigator.onLine) return 0;
  const pending = getPending();
  if (!pending.length) return 0;
  const { error } = await supabase
    .from("lesson_progress")
    .upsert(pending, { onConflict: "user_id,lesson_id" });
  if (!error) {
    setPending([]);
    return pending.length;
  }
  return 0;
}

export default function LessonPlayer() {
  const { slug, lessonId } = useParams();
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, { completed: boolean; pos: number }>>({});
  const [online, setOnline] = useState(navigator.onLine);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoCached, setVideoCached] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);
  const [videoMetaSize, setVideoMetaSize] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedPos = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  // Online/offline detection + auto-sync
  useEffect(() => {
    const onUp = async () => {
      setOnline(true);
      const n = await flushPending();
      if (n > 0) toast.success(t("lesson.synced").replace("{n}", String(n)));
    };
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    flushPending();
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, [t]);

  useEffect(() => {
    if (!slug || !user) return;
    (async () => {
      const { data: c } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
      if (!c) return;
      setCourse(c);
      const { data: ls } = await supabase.from("lessons").select("*").eq("course_id", c.id).order("position");
      setLessons(ls ?? []);
      const { data: p } = await supabase
        .from("lesson_progress").select("lesson_id, completed, last_position_seconds")
        .eq("course_id", c.id).eq("user_id", user.id);
      const map: Record<string, { completed: boolean; pos: number }> = {};
      p?.forEach((r) => (map[r.lesson_id] = { completed: r.completed, pos: r.last_position_seconds ?? 0 }));
      getPending().filter((q) => q.user_id === user.id).forEach((q) => {
        map[q.lesson_id] = { completed: q.completed, pos: q.last_position_seconds };
      });
      setProgress(map);
    })();
  }, [slug, user]);

  const lesson = useMemo(() => lessons.find((l) => l.id === lessonId), [lessons, lessonId]);
  const idx = useMemo(() => lessons.findIndex((l) => l.id === lessonId), [lessons, lessonId]);
  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null;

  // Resolve video src — prefer cached blob if present
  useEffect(() => {
    let revoked: string | null = null;
    (async () => {
      if (!lesson?.video_url) { setVideoSrc(null); setVideoCached(false); return; }
      const cached = await isVideoCached(lesson.id);
      setVideoCached(cached);
      const meta = await listCachedVideos();
      setVideoMetaSize(meta[lesson.id]?.size ?? null);
      if (cached) {
        const url = await getCachedVideoUrl(lesson.id);
        if (url) { setVideoSrc(url); revoked = url; return; }
      }
      setVideoSrc(lesson.video_url);
    })();
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [lesson?.id]);

  // Parse citation hash → highlight matching text in content
  useEffect(() => {
    const hash = decodeURIComponent(location.hash || "");
    const m = hash.match(/^#cite=(.+)$/);
    setHighlight(m ? m[1] : null);
    if (m && contentRef.current) {
      // Scroll to first match
      setTimeout(() => {
        const el = contentRef.current?.querySelector("mark.cite-hit");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [location.hash, lesson?.id]);

  const offlineStore = getOfflineStore();
  const isOffline = lesson ? !!offlineStore[lesson.id] : false;

  // Resume video position
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !lesson) return;
    const startAt = progress[lesson.id]?.pos ?? 0;
    const onLoaded = () => {
      if (startAt > 0 && startAt < (v.duration || Infinity) - 2) v.currentTime = startAt;
    };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [lesson, progress, videoSrc]);

  // Auto-issue certificate when course fully complete
  const tryIssueCertificate = async () => {
    if (!user || !course || lessons.length === 0) return;
    const allDone = lessons.every((l) => progress[l.id]?.completed);
    if (!allDone) return;
    const { data: existing } = await supabase
      .from("certificates").select("code").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
    if (existing) return;
    const { data, error } = await supabase
      .from("certificates")
      .insert({ user_id: user.id, course_id: course.id })
      .select("code")
      .maybeSingle();
    if (!error && data) {
      toast.success(t("cert.issued"), {
        action: { label: t("cert.view"), onClick: () => navigate(`/certificates/${data.code}`) },
      });
    }
  };

  const saveProgress = async (opts: { completed?: boolean; pos?: number } = {}) => {
    if (!user || !lesson || !course) return;
    const pos = Math.floor(opts.pos ?? videoRef.current?.currentTime ?? 0);
    const completed = opts.completed ?? progress[lesson.id]?.completed ?? false;
    const entry: PendingProgress = {
      user_id: user.id,
      lesson_id: lesson.id,
      course_id: course.id,
      last_position_seconds: pos,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    setProgress((p) => ({ ...p, [lesson.id]: { completed, pos } }));
    if (navigator.onLine) {
      const { error } = await supabase
        .from("lesson_progress")
        .upsert(entry, { onConflict: "user_id,lesson_id" });
      if (error) queueProgress(entry);
    } else {
      queueProgress(entry);
    }
    if (completed) setTimeout(tryIssueCertificate, 200);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const now = v.currentTime;
    if (Math.abs(now - lastSavedPos.current) >= 10) {
      lastSavedPos.current = now;
      saveProgress({ pos: now });
    }
  };

  const handleEnded = () => saveProgress({ completed: true, pos: videoRef.current?.currentTime ?? 0 });

  const markComplete = async () => {
    await saveProgress({ completed: true });
    toast.success(t("lesson.completed"));
  };

  const downloadOffline = async () => {
    if (!lesson) return;
    const title = lang === "fr" ? lesson.title_fr ?? lesson.title : lesson.title;
    const content = lang === "fr" ? lesson.content_fr ?? lesson.content ?? "" : lesson.content ?? "";
    setOffline(lesson.id, {
      title,
      content,
      videoUrl: lesson.video_url,
      attachmentUrl: lesson.attachment_url,
      savedAt: Date.now(),
    });
    const blob = new Blob([`${title}\n\n${content}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("lesson.savedOffline"));
  };

  const downloadVideoOffline = async () => {
    if (!lesson?.video_url) return;
    setDownloading(true);
    setDownloadPct(0);
    try {
      const blob = await downloadVideo(lesson.id, lesson.video_url, (p) => setDownloadPct(p));
      setVideoCached(true);
      setVideoMetaSize(blob.size);
      const url = await getCachedVideoUrl(lesson.id);
      if (url) setVideoSrc(url);
      toast.success(t("lesson.videoSaved"));
    } catch (e: any) {
      toast.error(e?.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const removeOfflineVideo = async () => {
    if (!lesson) return;
    await removeCachedVideo(lesson.id);
    setVideoCached(false);
    setVideoMetaSize(null);
    if (lesson.video_url) setVideoSrc(lesson.video_url);
    toast.success(t("lesson.videoRemoved"));
  };

  const downloadAttachment = () => {
    if (!lesson?.attachment_url) return;
    const a = document.createElement("a");
    a.href = lesson.attachment_url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.download = "";
    a.click();
  };

  if (!lesson || !course) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container py-20 text-muted-foreground">Loading…</main>
        <SiteFooter />
      </div>
    );
  }

  const title = lang === "fr" ? lesson.title_fr ?? lesson.title : lesson.title;
  const content = lang === "fr" ? lesson.content_fr ?? lesson.content : lesson.content;
  const pendingCount = getPending().length;

  // Highlight rendering
  const renderContent = () => {
    if (!content) return null;
    if (!highlight) return content;
    try {
      const safe = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 200);
      const re = new RegExp(`(${safe})`, "gi");
      const parts = content.split(re);
      return parts.map((p: string, i: number) =>
        re.test(p) ? <mark key={i} className="cite-hit rounded bg-secondary/60 px-0.5 text-foreground">{p}</mark> : <span key={i}>{p}</span>
      );
    } catch {
      return content;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        <div className="flex items-center justify-between gap-3">
          <Link to={`/courses/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← {lang === "fr" ? course.title_fr ?? course.title : course.title}
          </Link>
          <div className="flex items-center gap-2 text-xs">
            {!online && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-accent">
                <WifiOff className="h-3 w-3" /> {t("lesson.offline")}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/30 px-2 py-1 text-foreground">
                <CloudUpload className="h-3 w-3" /> {pendingCount} {t("lesson.pendingSync")}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_320px]">
          <article className="animate-fade-up">
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              {lesson.position}. {title}
            </h1>

            {lesson.video_url && (
              <div className="mt-6 aspect-video overflow-hidden rounded-2xl border border-border bg-black">
                {videoSrc && (
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    controls
                    className="h-full w-full"
                    onTimeUpdate={handleTimeUpdate}
                    onPause={() => saveProgress({})}
                    onEnded={handleEnded}
                  />
                )}
              </div>
            )}

            {lesson.video_url && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {videoCached ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
                      <Video className="h-3 w-3" /> {t("lesson.videoOffline")}
                      {videoMetaSize ? ` · ${formatBytes(videoMetaSize)}` : ""}
                    </span>
                    <Button size="sm" variant="ghost" onClick={removeOfflineVideo}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> {t("lesson.removeVideo")}
                    </Button>
                  </>
                ) : downloading ? (
                  <div className="flex w-full max-w-sm items-center gap-2">
                    <Progress value={downloadPct} className="flex-1" />
                    <span className="text-muted-foreground">{downloadPct}%</span>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={downloadVideoOffline}>
                    <Video className="mr-1 h-3.5 w-3.5" /> {t("lesson.downloadVideo")}
                  </Button>
                )}
              </div>
            )}

            <div ref={contentRef} className="prose prose-sm mt-6 max-w-none whitespace-pre-wrap text-foreground/90">
              {renderContent()}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={markComplete} disabled={progress[lesson.id]?.completed} className="bg-grad-primary">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {progress[lesson.id]?.completed ? t("lesson.completed") : t("lesson.markComplete")}
              </Button>
              <Button onClick={downloadOffline} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {isOffline ? t("lesson.downloadAgain") : t("lesson.download")}
              </Button>
              {lesson.attachment_url && (
                <Button onClick={downloadAttachment} variant="outline">
                  <Paperclip className="mr-2 h-4 w-4" />
                  {t("lesson.attachment")}
                </Button>
              )}
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
              {prev ? (
                <Button asChild variant="ghost">
                  <Link to={`/courses/${slug}/lessons/${prev.id}`}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> {t("lesson.prev")}
                  </Link>
                </Button>
              ) : <span />}
              {next ? (
                <Button asChild variant="ghost">
                  <Link to={`/courses/${slug}/lessons/${next.id}`}>
                    {t("lesson.next")} <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : <span />}
            </div>
          </article>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("course.curriculum")}
              </div>
              <ul className="mt-3 space-y-1.5">
                {lessons.map((l) => (
                  <li key={l.id}>
                    <Link
                      to={`/courses/${slug}/lessons/${l.id}`}
                      className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
                        l.id === lesson.id ? "bg-primary/10 text-primary" : "hover:bg-soft"
                      }`}
                    >
                      {progress[l.id]?.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-border" />
                      )}
                      <span className="line-clamp-1">{l.position}. {lang === "fr" ? l.title_fr ?? l.title : l.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {lessons.length > 0 && lessons.every((l) => progress[l.id]?.completed) && (
                <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                  <Link to={`/dashboard?tab=certificates`}>
                    <Award className="mr-1 h-4 w-4" /> {t("cert.viewMine")}
                  </Link>
                </Button>
              )}
            </div>

            <AITutor
              courseId={course.id}
              courseSlug={slug!}
              courseTitle={lang === "fr" ? course.title_fr ?? course.title : course.title}
            />
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
