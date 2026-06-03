import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase, GraduationCap, HandCoins, Building2, Plus, Search, ExternalLink,
  Trash2, Pencil, Eye, EyeOff, Send, Inbox, Sparkles, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const TYPE_ICON: Record<string, any> = {
  job: Briefcase, internship: GraduationCap, grant: HandCoins, program: Building2,
};

const STATUS_VARIANT: Record<string, string> = {
  pending: "bg-secondary/30 text-foreground",
  reviewing: "bg-primary/10 text-primary",
  accepted: "bg-primary text-primary-foreground",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

type Opportunity = {
  id: string; type: string; title: string; organization: string;
  location: string | null; description: string | null; url: string | null;
  deadline: string | null; status: string; posted_by: string | null;
};

const oppSchema = z.object({
  type: z.enum(["job", "internship", "grant", "program"]),
  title: z.string().trim().min(1).max(200),
  organization: z.string().trim().min(1).max(200),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  url: z.string().trim().url().max(500).optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
});

const emptyForm = {
  type: "job", title: "", organization: "", location: "",
  description: "", url: "", deadline: "",
};

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [canPost, setCanPost] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  // applications by current user (id -> {status})
  const [myApps, setMyApps] = useState<Record<string, { id: string; status: string }>>({});
  const [applyOpen, setApplyOpen] = useState<Opportunity | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const load = async () => {
    let query = supabase.from("opportunities").select("*").order("created_at", { ascending: false });
    if (tab === "mine" && user) query = query.eq("posted_by", user.id);
    else query = query.eq("status", "open");
    const { data } = await query;
    setItems((data as Opportunity[]) ?? []);
  };

  const loadApps = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("applications")
      .select("id, opportunity_id, status")
      .eq("applicant_id", user.id);
    const map: Record<string, { id: string; status: string }> = {};
    (data ?? []).forEach((a) => (map[a.opportunity_id] = { id: a.id, status: a.status }));
    setMyApps(map);
  };

  useEffect(() => { load(); }, [tab, user]);
  useEffect(() => { loadApps(); }, [user]);

  const [isMentorOnly, setIsMentorOnly] = useState(false);
  useEffect(() => {
    if (!user) { setCanPost(false); setIsMentorOnly(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      const roles = (data ?? []).map((r) => r.role);
      setCanPost(roles.includes("employer") || roles.includes("admin") || roles.includes("mentor"));
      setIsMentorOnly(roles.includes("mentor") && !roles.includes("admin") && !roles.includes("employer"));
    });
  }, [user]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (type !== "all" && i.type !== type) return false;
      if (term && ![i.title, i.organization, i.location, i.description].some((v) => v?.toLowerCase().includes(term))) return false;
      return true;
    });
  }, [items, q, type]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (it: Opportunity) => {
    setEditingId(it.id);
    setForm({
      type: it.type, title: it.title, organization: it.organization,
      location: it.location ?? "", description: it.description ?? "",
      url: it.url ?? "", deadline: it.deadline ?? "",
    });
    setOpen(true);
  };

  const submit = async (requested: "open" | "draft") => {
    if (!user) return;
    const parsed = oppSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    // Mentors cannot directly publish — submissions go for admin approval
    const status = isMentorOnly && requested === "open" ? "pending_approval" : requested;
    const payload = {
      type: form.type,
      title: form.title.trim(),
      organization: form.organization.trim(),
      location: form.location.trim() || null,
      description: form.description.trim() || null,
      url: form.url.trim() || null,
      deadline: form.deadline || null,
      status,
    };
    if (editingId) {
      const { error } = await supabase.from("opportunities").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success(t("opps.updated"));
    } else {
      const { error } = await supabase.from("opportunities").insert({ ...payload, posted_by: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success(
        status === "pending_approval"
          ? "Submitted for admin approval"
          : status === "open" ? t("opps.posted") : t("opps.savedDraft")
      );
    }
    setOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    load();
  };

  const togglePublish = async (it: Opportunity) => {
    const next = it.status === "open" ? "draft" : "open";
    const { error } = await supabase.from("opportunities").update({ status: next }).eq("id", it.id);
    if (error) toast.error(error.message);
    else { toast.success(next === "open" ? t("opps.published") : t("opps.unpublished")); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t("opps.deleted")); load(); }
  };

  const submitApplication = async () => {
    if (!user || !applyOpen) return;
    const { error } = await supabase.from("applications").insert({
      opportunity_id: applyOpen.id,
      applicant_id: user.id,
      cover_letter: coverLetter.trim() || null,
      status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("apps.submitted"));
    setApplyOpen(null);
    setCoverLetter("");
    loadApps();
  };

  const generateAiCoverLetter = async () => {
    if (!user || !applyOpen) return;
    setAiBusy(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,headline,bio,phone,city,country,skills,education,experience,links,target_role,key_project_summary,cover_letter_recipient")
      .eq("id", user.id).maybeSingle();
    const { data, error } = await supabase.functions.invoke("generate-cv", {
      body: {
        mode: "cover_letter",
        profile: { ...(profile ?? {}), email: user.email },
        opportunity: applyOpen,
      },
    });
    setAiBusy(false);
    if (error) { toast.error(error.message); return; }
    const content = (data as any)?.content as string | undefined;
    if (content) setCoverLetter(content);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="animate-fade-up">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              {t("opps.kicker")}
            </span>
            <h1 className="mt-2 font-display text-3xl font-bold md:text-5xl">{t("opps.title")}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{t("opps.sub")}</p>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Button asChild variant="outline">
                <Link to="/applications"><Inbox className="mr-2 h-4 w-4" />{t("apps.mine")}</Link>
              </Button>
            )}
            {canPost && (
              <Button onClick={openCreate} className="bg-grad-primary">
                <Plus className="mr-2 h-4 w-4" />{t("opps.post")}
              </Button>
            )}
          </div>
        </div>

        {canPost && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-6">
            <TabsList>
              <TabsTrigger value="browse">{t("opps.tabBrowse")}</TabsTrigger>
              <TabsTrigger value="mine">{t("opps.tabMine")}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("opps.search")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("opps.allTypes")}</SelectItem>
              <SelectItem value="job">Jobs</SelectItem>
              <SelectItem value="internship">Internships</SelectItem>
              <SelectItem value="grant">Grants</SelectItem>
              <SelectItem value="program">Programs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {filtered.map((it) => {
            const Icon = TYPE_ICON[it.type] ?? Briefcase;
            const mine = user?.id === it.posted_by;
            const myApp = myApps[it.id];
            return (
              <article key={it.id} className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:shadow-soft">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-secondary/30 text-foreground capitalize">{it.type}</Badge>
                    {it.status !== "open" && <Badge variant="outline" className="capitalize">{it.status}</Badge>}
                    {it.location && <span className="text-xs text-muted-foreground">{it.location}</span>}
                    {it.deadline && <span className="text-xs text-muted-foreground">· deadline {it.deadline}</span>}
                  </div>
                  <h3 className="mt-1 font-display text-lg font-semibold leading-tight group-hover:text-primary">{it.title}</h3>
                  <p className="text-sm text-muted-foreground">{it.organization}</p>
                  {it.description && <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{it.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!mine && user && (
                      myApp && myApp.status !== "withdrawn" ? (
                        <Badge className={`capitalize ${STATUS_VARIANT[myApp.status] ?? ""}`}>
                          {t(`apps.status.${myApp.status}`)}
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => { setApplyOpen(it); setCoverLetter(""); }} className="bg-grad-primary">
                          <Send className="mr-1 h-3.5 w-3.5" /> {t("opps.apply")}
                        </Button>
                      )
                    )}
                    {it.url && (
                      <a href={it.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        {t("opps.external")} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {mine && (
                      <>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/applications?opp=${it.id}`}>
                            <Inbox className="mr-1 h-4 w-4" /> {t("apps.received")}
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(it)}>
                          <Pencil className="mr-1 h-4 w-4" /> {t("opps.edit")}
                        </Button>
                        {!isMentorOnly && (
                          <Button variant="ghost" size="sm" onClick={() => togglePublish(it)}>
                            {it.status === "open"
                              ? <><EyeOff className="mr-1 h-4 w-4" /> {t("opps.unpublish")}</>
                              : <><Eye className="mr-1 h-4 w-4" /> {t("opps.publish")}</>}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => remove(it.id)}>
                          <Trash2 className="mr-1 h-4 w-4" /> {t("opps.delete")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {filtered.length === 0 && <p className="text-muted-foreground">{t("opps.empty")}</p>}
        </div>

        {/* Create / edit listing */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? t("opps.edit") : t("opps.post")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder={t("opps.f.title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
              <Input placeholder={t("opps.f.org")} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} maxLength={200} />
              <Input placeholder={t("opps.f.location")} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={200} />
              <Input placeholder={t("opps.f.url")} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} maxLength={500} />
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              <Textarea placeholder={t("opps.f.desc")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={4000} rows={4} />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => submit("draft")}>{t("opps.saveDraft")}</Button>
              <Button onClick={() => submit("open")} className="bg-grad-primary">
                {isMentorOnly ? "Submit for approval" : t("opps.publish")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Apply */}
        <Dialog open={!!applyOpen} onOpenChange={(o) => !o && setApplyOpen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("apps.applyTo")} — {applyOpen?.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t("apps.coverHint")}</p>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={generateAiCoverLetter} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                Generate with AI from my profile
              </Button>
            </div>
            <Textarea
              placeholder={t("apps.coverPlaceholder")}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={8}
              maxLength={4000}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyOpen(null)}>{t("apps.cancel")}</Button>
              <Button onClick={submitApplication} className="bg-grad-primary">
                <Send className="mr-1 h-4 w-4" /> {t("apps.submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <SiteFooter />
    </div>
  );
}
