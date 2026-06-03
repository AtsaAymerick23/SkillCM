import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Award, ArrowRight } from "lucide-react";

type Row = {
  id: string;
  code: string;
  issued_at: string;
  course_id: string;
  course_title: string;
  course_title_fr: string | null;
  course_slug: string;
};

export default function CertificatesList() {
  const { user, loading } = useAuth();
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("certificates")
        .select("id, code, issued_at, course_id")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });
      const rows = data ?? [];
      const ids = rows.map((r) => r.course_id);
      const { data: courses } = ids.length
        ? await supabase.from("courses").select("id, title, title_fr, slug").in("id", ids)
        : { data: [] as any[] };
      setItems(
        rows.map((r) => {
          const c = courses?.find((x) => x.id === r.course_id);
          return {
            id: r.id,
            code: r.code,
            issued_at: r.issued_at,
            course_id: r.course_id,
            course_title: c?.title ?? "Course",
            course_title_fr: c?.title_fr ?? null,
            course_slug: c?.slug ?? "",
          };
        })
      );
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-12">
        <div className="animate-fade-up">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">{t("cert.kicker")}</span>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-5xl">{t("cert.myTitle")}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("cert.mySub")}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map((it) => (
            <Link
              key={it.id}
              to={`/certificates/${it.code}`}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:shadow-soft"
            >
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-grad-primary text-primary-foreground">
                <Award className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-primary">
                  {lang === "fr" ? it.course_title_fr ?? it.course_title : it.course_title}
                </h3>
                <p className="mt-1 text-xs font-mono text-muted-foreground">{it.code}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(it.issued_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
                  {t("cert.view")} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
          {items.length === 0 && (
            <p className="text-muted-foreground">{t("cert.empty")}</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
