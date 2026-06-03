import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Users, MapPin, Briefcase } from "lucide-react";

type Mentor = {
  id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  city: string | null;
  skills: string[] | null;
  avatar_url: string | null;
};

export default function MentorsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Mentor | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "mentor");
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (ids.length === 0) { setMentors([]); setLoading(false); return; }
      const { data } = await supabase.rpc("get_public_profiles", { user_ids: ids });
      setMentors((data as Mentor[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const requestBooking = async () => {
    if (!user || !selected) return;
    setSubmitting(true);
    const { error } = await supabase.from("mentor_bookings").insert({
      mentor_id: selected.id, cadet_id: user.id, note: note || null, status: "pending",
    });
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: selected.id, type: "booking",
        title: "New booking request",
        body: `A cadet has requested a session with you.`,
        link: "/dashboard",
      });
      // Award "mentor_connected" badge to cadet (first time)
      const { data: badge } = await supabase.from("badges").select("id, points").eq("code", "mentor_connected").maybeSingle();
      if (badge) {
        const { error: be } = await supabase.from("user_badges").insert({ user_id: user.id, badge_id: badge.id });
        if (!be) {
          const { data: cur } = await supabase.from("user_points").select("points").eq("user_id", user.id).maybeSingle();
          await supabase.from("user_points").upsert(
            { user_id: user.id, points: (cur?.points ?? 0) + badge.points },
            { onConflict: "user_id" }
          );
        }
      }
      toast.success(t("mentors.requested"));
      setSelected(null); setNote("");
    } else {
      toast.error(error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-soft">
      <SiteHeader />
      <main className="container py-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-grad-primary">
            <Users className="h-6 w-6 text-primary-foreground" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold">{t("mentors.title")}</h1>
            <p className="text-muted-foreground">{t("mentors.sub")}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : mentors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">{t("mentors.empty")}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map((m) => (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {(m.full_name ?? "M").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{m.full_name ?? "Mentor"}</p>
                    {m.headline && <p className="truncate text-xs text-muted-foreground">{m.headline}</p>}
                  </div>
                </div>
                {m.city && (
                  <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {m.city}
                  </p>
                )}
                {m.bio && <p className="mt-3 line-clamp-3 text-sm text-foreground/80">{m.bio}</p>}
                {m.skills && m.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {m.skills.slice(0, 4).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                )}
                <Dialog open={selected?.id === m.id} onOpenChange={(o) => { if (!o) { setSelected(null); setNote(""); } }}>
                  <DialogTrigger asChild>
                    <Button className="mt-4 w-full bg-grad-primary" onClick={() => setSelected(m)}>
                      <Briefcase className="mr-2 h-4 w-4" /> {t("mentors.request")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("mentors.requestTitle")} — {m.full_name}</DialogTitle>
                    </DialogHeader>
                    <Textarea
                      placeholder={t("mentors.notePlaceholder")}
                      value={note} onChange={(e) => setNote(e.target.value)} rows={5}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setSelected(null); setNote(""); }}>
                        {t("common.cancel")}
                      </Button>
                      <Button onClick={requestBooking} disabled={submitting} className="bg-grad-primary">
                        {submitting ? "…" : t("mentors.send")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
