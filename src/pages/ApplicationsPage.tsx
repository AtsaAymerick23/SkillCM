import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Inbox, Briefcase, ExternalLink, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_CLR: Record<string, string> = {
  pending: "bg-secondary/30 text-foreground",
  reviewing: "bg-primary/10 text-primary",
  accepted: "bg-primary text-primary-foreground",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

type App = {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  cover_letter: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export default function ApplicationsPage() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const oppFilter = params.get("opp");

  const [tab, setTab] = useState<"mine" | "received">(oppFilter ? "received" : "mine");
  const [mine, setMine] = useState<App[]>([]);
  const [received, setReceived] = useState<App[]>([]);
  const [opps, setOpps] = useState<Record<string, any>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  const loadAll = async () => {
    if (!user) return;
    // Apps I submitted
    const { data: m } = await supabase
      .from("applications")
      .select("*")
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false });
    setMine((m as App[]) ?? []);

    // My posted opportunities
    const { data: myOpps } = await supabase
      .from("opportunities")
      .select("id")
      .eq("posted_by", user.id);
    const myOppIds = (myOpps ?? []).map((o) => o.id);
    let recv: App[] = [];
    if (myOppIds.length) {
      let q = supabase.from("applications").select("*").in("opportunity_id", myOppIds);
      if (oppFilter) q = q.eq("opportunity_id", oppFilter);
      const { data } = await q.order("created_at", { ascending: false });
      recv = (data as App[]) ?? [];
    }
    setReceived(recv);

    // Hydrate referenced opportunities
    const oppIds = Array.from(new Set([...(m ?? []).map((a) => a.opportunity_id), ...recv.map((a) => a.opportunity_id)]));
    if (oppIds.length) {
      const { data } = await supabase
        .from("opportunities").select("id, title, organization, type, location")
        .in("id", oppIds);
      const map: Record<string, any> = {};
      data?.forEach((o) => (map[o.id] = o));
      setOpps(map);
    }

    // Hydrate applicant profiles
    const applicantIds = Array.from(new Set(recv.map((a) => a.applicant_id)));
    if (applicantIds.length) {
      const { data } = await supabase.rpc("get_public_profiles", { user_ids: applicantIds });
      const map: Record<string, any> = {};
      data?.forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }
  };

  useEffect(() => { loadAll(); }, [user, oppFilter]);

  const withdraw = async (id: string) => {
    const { error } = await supabase.from("applications").update({ status: "withdrawn" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("apps.withdrawn"));
    loadAll();
  };

  const reapply = async (id: string) => {
    const { error } = await supabase.from("applications").update({ status: "pending" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    loadAll();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("apps.deleted"));
    loadAll();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("apps.statusUpdated"));
    loadAll();
  };

  const list = tab === "mine" ? mine : received;
  const showReceivedTab = received.length > 0 || oppFilter;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-12">
        <div className="animate-fade-up">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">{t("apps.kicker")}</span>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-5xl">{t("apps.title")}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("apps.sub")}</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-6">
          <TabsList>
            <TabsTrigger value="mine">{t("apps.mine")}</TabsTrigger>
            {showReceivedTab && <TabsTrigger value="received">{t("apps.received")}</TabsTrigger>}
          </TabsList>
        </Tabs>

        <div className="mt-6 grid gap-3">
          {list.map((a) => {
            const opp = opps[a.opportunity_id];
            const applicant = profiles[a.applicant_id];
            return (
              <article key={a.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`capitalize ${STATUS_CLR[a.status] ?? ""}`}>
                        {t(`apps.status.${a.status}`)}
                      </Badge>
                      {opp && (
                        <Badge variant="outline" className="capitalize">{opp.type}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}
                      </span>
                    </div>
                    <h3 className="mt-1 font-display text-lg font-semibold">
                      {opp?.title ?? "—"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {opp?.organization}{opp?.location ? ` · ${opp.location}` : ""}
                    </p>
                    {tab === "received" && (
                      <p className="mt-1 text-sm">
                        <span className="text-muted-foreground">{t("apps.from")}: </span>
                        <span className="font-medium">{applicant?.full_name ?? a.applicant_id.slice(0, 8)}</span>
                      </p>
                    )}
                    {a.cover_letter && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-primary">{t("apps.cover")}</summary>
                        <p className="mt-2 whitespace-pre-wrap text-foreground/90">{a.cover_letter}</p>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {tab === "mine" ? (
                      <>
                        {a.status !== "withdrawn" && a.status !== "rejected" && a.status !== "accepted" && (
                          <Button size="sm" variant="outline" onClick={() => withdraw(a.id)}>
                            <Undo2 className="mr-1 h-4 w-4" /> {t("apps.withdraw")}
                          </Button>
                        )}
                        {a.status === "withdrawn" && (
                          <Button size="sm" variant="outline" onClick={() => reapply(a.id)}>
                            {t("apps.reapply")}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                          <Trash2 className="mr-1 h-4 w-4" /> {t("apps.delete")}
                        </Button>
                      </>
                    ) : (
                      <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v)}>
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t("apps.status.pending")}</SelectItem>
                          <SelectItem value="reviewing">{t("apps.status.reviewing")}</SelectItem>
                          <SelectItem value="accepted">{t("apps.status.accepted")}</SelectItem>
                          <SelectItem value="rejected">{t("apps.status.rejected")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {list.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">{t("apps.empty")}</p>
              <Button asChild className="mt-4 bg-grad-primary">
                <Link to="/opportunities"><Briefcase className="mr-1 h-4 w-4" /> {t("apps.browseOpps")}</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
