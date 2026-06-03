import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/SiteHeader";
import { toast } from "sonner";
import { Loader2, Sparkles, Lightbulb, Route as RouteIcon, Wallet, Trash2, Printer } from "lucide-react";

type Mode = "business_plan" | "roadmap" | "profit_planner";

type SavedProject = {
  id: string;
  name: string;
  type: Mode;
  inputs: Record<string, unknown>;
  output: Record<string, unknown>;
  created_at: string;
};

const fcfa = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " FCFA";

export default function StartupLab() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Mode>("business_plan");
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [activeProject, setActiveProject] = useState<SavedProject | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const refreshProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("startup_projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setProjects((data ?? []) as SavedProject[]);
  };

  useEffect(() => { refreshProjects(); }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("startup_projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("sl.deleted"));
    if (activeProject?.id === id) setActiveProject(null);
    refreshProjects();
  };

  if (loading || !user) return null;

  const filtered = projects.filter((p) => p.type === tab);

  return (
    <div className="min-h-screen bg-soft">
      <SiteHeader />
      <main className="container py-10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-grad-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">{t("sl.kicker")}</p>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{t("sl.title")}</h1>
          </div>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("sl.sub")}</p>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as Mode); setActiveProject(null); }} className="mt-8">
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="business_plan"><Lightbulb className="mr-1.5 h-4 w-4" />{t("sl.tab.bp")}</TabsTrigger>
            <TabsTrigger value="roadmap"><RouteIcon className="mr-1.5 h-4 w-4" />{t("sl.tab.rm")}</TabsTrigger>
            <TabsTrigger value="profit_planner"><Wallet className="mr-1.5 h-4 w-4" />{t("sl.tab.pp")}</TabsTrigger>
          </TabsList>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
            <div>
              <TabsContent value="business_plan" className="mt-0">
                <BusinessPlanPanel
                  lang={lang}
                  active={activeProject}
                  onSaved={(p) => { setActiveProject(p); refreshProjects(); }}
                />
              </TabsContent>
              <TabsContent value="roadmap" className="mt-0">
                <RoadmapPanel
                  lang={lang}
                  active={activeProject}
                  onSaved={(p) => { setActiveProject(p); refreshProjects(); }}
                />
              </TabsContent>
              <TabsContent value="profit_planner" className="mt-0">
                <ProfitPlannerPanel
                  lang={lang}
                  active={activeProject}
                  onSaved={(p) => { setActiveProject(p); refreshProjects(); }}
                />
              </TabsContent>
            </div>

            <aside className="space-y-3">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("sl.saved")}
              </h3>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("sl.savedEmpty")}</p>
              ) : (
                filtered.map((p) => (
                  <div
                    key={p.id}
                    className={`group rounded-xl border bg-card p-3 transition hover:shadow-soft ${
                      activeProject?.id === p.id ? "border-primary" : "border-border"
                    }`}
                  >
                    <button
                      onClick={() => setActiveProject(p)}
                      className="block w-full text-left"
                    >
                      <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}
                      </p>
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(p.id)}
                      className="mt-1 h-7 px-2 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> {t("sl.delete")}
                    </Button>
                  </div>
                ))
              )}
            </aside>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

// ---------- Shared helpers ----------

async function generate(mode: Mode, inputs: Record<string, unknown>, lang: string) {
  const { data, error } = await supabase.functions.invoke("startup-ai", {
    body: { mode, inputs, lang },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).output as Record<string, unknown>;
}

async function saveProject(
  user_id: string,
  name: string,
  type: Mode,
  inputs: Record<string, unknown>,
  output: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("startup_projects")
    .insert({ user_id, name, type, inputs: inputs as any, output: output as any })
    .select()
    .single();
  if (error) throw error;
  return data as SavedProject;
}

// ---------- Business Plan ----------

type PanelProps = {
  lang: string;
  active: SavedProject | null;
  onSaved: (p: SavedProject) => void;
};

function BusinessPlanPanel({ lang, active, onSaved }: PanelProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [idea, setIdea] = useState("");
  const [audience, setAudience] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (active && active.type === "business_plan") {
      setIdea(String(active.inputs.idea ?? ""));
      setAudience(String(active.inputs.audience ?? ""));
      setBudget(String(active.inputs.budget ?? ""));
    }
  }, [active]);

  const output = active?.type === "business_plan" ? (active.output as any) : null;

  const handleGenerate = async () => {
    if (!user || !idea.trim()) {
      toast.error(t("sl.ideaRequired"));
      return;
    }
    setBusy(true);
    try {
      const inputs = { idea, audience, budget };
      const out = await generate("business_plan", inputs, lang);
      const saved = await saveProject(user.id, idea.slice(0, 60), "business_plan", inputs, out);
      onSaved(saved);
      toast.success(t("sl.generated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sl.bp.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="bp-idea">{t("sl.bp.idea")}</Label>
          <Textarea
            id="bp-idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={t("sl.bp.ideaPh")}
            rows={3}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="bp-aud">{t("sl.bp.audience")}</Label>
            <Input id="bp-aud" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder={t("sl.bp.audiencePh")} />
          </div>
          <div>
            <Label htmlFor="bp-bud">{t("sl.bp.budget")}</Label>
            <Input id="bp-bud" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 100,000 FCFA" />
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={busy} className="bg-grad-primary shadow-soft">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {t("sl.generate")}
        </Button>

        {output && (
          <div className="mt-6 space-y-5 rounded-xl border border-border bg-soft p-5 print:bg-white">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl font-bold">{t("sl.bp.title")}</h3>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" /> {t("sl.print")}
              </Button>
            </div>
            <Section title={t("sl.bp.summary")} body={output.summary} />
            <Section title={t("sl.bp.problem")} body={output.problem} />
            <Section title={t("sl.bp.solution")} body={output.solution} />
            <Section title={t("sl.bp.market")} body={output.target_market} />
            <Section title={t("sl.bp.value")} body={output.value_proposition} />
            <Section title={t("sl.bp.revenue")} body={output.revenue_model} />
            <Section title={t("sl.bp.gtm")} body={output.go_to_market} />
            <Section title={t("sl.bp.competition")} body={output.competition} />
            <ListSection title={t("sl.bp.risks")} items={output.key_risks} />
            <ListSection title={t("sl.bp.steps")} items={output.next_steps} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, body }: { title: string; body?: string }) {
  if (!body) return null;
  return (
    <div>
      <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">{title}</h4>
      <p className="mt-1 text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{body}</p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground/90">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

// ---------- Roadmap ----------

function RoadmapPanel({ lang, active, onSaved }: PanelProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [goal, setGoal] = useState("");
  const [stage, setStage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (active && active.type === "roadmap") {
      setGoal(String(active.inputs.goal ?? ""));
      setStage(String(active.inputs.stage ?? ""));
    }
  }, [active]);

  const output = active?.type === "roadmap" ? (active.output as any) : null;

  const handleGenerate = async () => {
    if (!user || !goal.trim()) return toast.error(t("sl.goalRequired"));
    setBusy(true);
    try {
      const inputs = { goal, stage };
      const out = await generate("roadmap", inputs, lang);
      const saved = await saveProject(user.id, goal.slice(0, 60), "roadmap", inputs, out);
      onSaved(saved);
      toast.success(t("sl.generated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sl.rm.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="rm-goal">{t("sl.rm.goal")}</Label>
          <Textarea id="rm-goal" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={t("sl.rm.goalPh")} />
        </div>
        <div>
          <Label htmlFor="rm-stage">{t("sl.rm.stage")}</Label>
          <Input id="rm-stage" value={stage} onChange={(e) => setStage(e.target.value)} placeholder={t("sl.rm.stagePh")} />
        </div>
        <Button onClick={handleGenerate} disabled={busy} className="bg-grad-primary shadow-soft">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {t("sl.generate")}
        </Button>

        {output && (
          <div className="mt-6 space-y-5 rounded-xl border border-border bg-soft p-5 print:bg-white">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl font-bold">{output.vision}</h3>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" /> {t("sl.print")}
              </Button>
            </div>
            <ol className="relative space-y-5 border-l-2 border-primary/30 pl-5">
              {(output.phases ?? []).map((ph: any, i: number) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-grad-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h4 className="font-display text-base font-semibold">{ph.name}</h4>
                    <Badge variant="secondary">{ph.timeframe}</Badge>
                  </div>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <ListSection title={t("sl.rm.goals")} items={ph.goals} />
                    <ListSection title={t("sl.rm.milestones")} items={ph.milestones} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Profit Planner ----------

function ProfitPlannerPanel({ lang, active, onSaved }: PanelProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [unitsPerMonth, setUnits] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (active && active.type === "profit_planner") {
      setProduct(String(active.inputs.product ?? ""));
      setPrice(String(active.inputs.price ?? ""));
      setUnits(String(active.inputs.units_per_month ?? ""));
      setNotes(String(active.inputs.notes ?? ""));
    }
  }, [active]);

  const output = active?.type === "profit_planner" ? (active.output as any) : null;

  const handleGenerate = async () => {
    if (!user || !product.trim()) return toast.error(t("sl.productRequired"));
    setBusy(true);
    try {
      const inputs = {
        product,
        price: Number(price) || price,
        units_per_month: Number(unitsPerMonth) || unitsPerMonth,
        notes,
        currency: "FCFA",
      };
      const out = await generate("profit_planner", inputs, lang);
      const saved = await saveProject(user.id, product.slice(0, 60), "profit_planner", inputs, out);
      onSaved(saved);
      toast.success(t("sl.generated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sl.pp.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="pp-prod">{t("sl.pp.product")}</Label>
          <Input id="pp-prod" value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t("sl.pp.productPh")} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="pp-price">{t("sl.pp.price")}</Label>
            <Input id="pp-price" type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2500" />
          </div>
          <div>
            <Label htmlFor="pp-units">{t("sl.pp.units")}</Label>
            <Input id="pp-units" type="number" inputMode="numeric" value={unitsPerMonth} onChange={(e) => setUnits(e.target.value)} placeholder="40" />
          </div>
        </div>
        <div>
          <Label htmlFor="pp-notes">{t("sl.pp.notes")}</Label>
          <Textarea id="pp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("sl.pp.notesPh")} />
        </div>
        <Button onClick={handleGenerate} disabled={busy} className="bg-grad-primary shadow-soft">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {t("sl.generate")}
        </Button>

        {output && (
          <div className="mt-6 space-y-5 rounded-xl border border-border bg-soft p-5 print:bg-white">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl font-bold">{t("sl.pp.title")}</h3>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" /> {t("sl.print")}
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Stat label={t("sl.pp.revenue")} value={fcfa(output.monthly_revenue_estimate)} />
              <Stat label={t("sl.pp.costs")} value={fcfa(output.total_monthly_costs)} />
              <Stat
                label={t("sl.pp.profit")}
                value={fcfa(output.monthly_profit)}
                accent={output.monthly_profit >= 0 ? "text-primary" : "text-destructive"}
              />
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">{t("sl.pp.breakdown")}</h4>
              <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
                {(output.monthly_costs ?? []).map((c: any, i: number) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{c.label}</span>
                    <span className="font-medium">{fcfa(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm">
              <span className="font-semibold">{t("sl.pp.breakeven")}: </span>
              {Math.round(output.break_even_units ?? 0)} {t("sl.pp.unitsPerMonth")}
            </p>
            <ListSection title={t("sl.pp.assumptions")} items={output.assumptions} />
            <ListSection title={t("sl.pp.advice")} items={output.advice} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}
