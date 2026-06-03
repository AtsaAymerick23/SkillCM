import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Printer, ShieldCheck, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import logoAsset from "@/assets/skillcm-logo.png.asset.json";

type CertView = {
  code: string;
  issued_at: string;
  course: { title: string; title_fr: string | null; slug: string } | null;
  recipient: string;
};

export default function Certificate() {
  const { code } = useParams();
  const { lang, t } = useI18n();
  const [cert, setCert] = useState<CertView | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    (async () => {
      const { data } = await supabase
        .from("certificates")
        .select("code, issued_at, user_id, course_id")
        .eq("code", code)
        .maybeSingle();
      if (!data) { setNotFound(true); return; }
      const [{ data: course }, { data: profiles }] = await Promise.all([
        supabase.from("courses").select("title, title_fr, slug").eq("id", data.course_id).maybeSingle(),
        supabase.rpc("get_public_profiles", { user_ids: [data.user_id] }),
      ]);
      const profile = Array.isArray(profiles) ? profiles[0] : null;
      setCert({
        code: data.code,
        issued_at: data.issued_at,
        course: course as any,
        recipient: profile?.full_name ?? "Verified learner",
      });
    })();
  }, [code]);

  const verifyUrl = typeof window !== "undefined" ? `${window.location.origin}/certificates/${code}` : "";
  const courseTitle = cert?.course
    ? lang === "fr"
      ? cert.course.title_fr ?? cert.course.title
      : cert.course.title
    : "";

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold">{t("cert.notFound")}</h1>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10 print:py-0">
        <div className="flex items-center justify-between print:hidden">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> {t("nav.back")}</Link>
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <Printer className="mr-1 h-4 w-4" /> {t("cert.print")}
          </Button>
        </div>

        {cert && (
          <div className="mx-auto mt-6 max-w-4xl print:mt-0">
            <div className="relative overflow-hidden rounded-3xl border-4 border-primary bg-card p-10 shadow-elevated print:border-2 print:shadow-none">
              {/* Decorative gradient ribbon */}
              <div className="absolute inset-x-0 top-0 h-2 bg-grad-primary" />
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary/20 blur-2xl" />
              <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-accent/10 blur-2xl" />

              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src={logoAsset.url} alt="SkillCM logo" className="h-14 w-auto" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                      SkillCM · Cameroon
                    </div>
                    <div className="text-xs text-muted-foreground">{t("cert.subtitle")}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    <ShieldCheck className="h-3 w-3" /> {t("cert.verify")}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">ID: {cert.code}</div>
                  <div className="text-xs text-muted-foreground">{new Date(cert.issued_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })}</div>
                </div>
              </div>

              <div className="relative mt-12 text-center">
                <p className="text-sm uppercase tracking-widest text-muted-foreground">
                  {t("cert.awardedTo")}
                </p>
                <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">{cert.recipient}</h1>
                <p className="mt-6 text-sm text-muted-foreground">{t("cert.forCompleting")}</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-primary md:text-3xl">
                  {courseTitle}
                </h2>
              </div>

              <div className="relative mt-12 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("cert.signed")}
                  </div>
                  <div className="mt-2 font-display text-lg font-semibold">National Digital Skills Authority</div>
                  <div className="text-xs text-muted-foreground">Yaoundé, Cameroon</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-border bg-background p-2">
                    <QRCodeSVG value={verifyUrl} size={96} level="M" />
                  </div>
                  <div className="text-xs">
                    <div className="inline-flex items-center gap-1 font-semibold text-primary">
                      <ShieldCheck className="h-3.5 w-3.5" /> {t("cert.verify")}
                    </div>
                    <div className="break-all text-muted-foreground max-w-[180px]">{verifyUrl}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
