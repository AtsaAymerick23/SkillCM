import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Mail, Phone, MapPin, Link as LinkIcon, Award } from "lucide-react";

type Profile = {
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  skills: string[] | null;
  education: { school: string; degree: string; year: string }[] | null;
  experience: { role: string; org: string; period: string; description: string }[] | null;
  links: { label: string; url: string }[] | null;
};

type Cert = { id: string; code: string; issued_at: string; course_id: string; course_title?: string };

export default function CVPage() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [certs, setCerts] = useState<Cert[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name,headline,bio,phone,city,country,skills,education,experience,links")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(p as unknown as Profile);

      const { data: cs } = await supabase
        .from("certificates")
        .select("id,code,issued_at,course_id")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });
      const list = (cs ?? []) as Cert[];
      if (list.length) {
        const ids = [...new Set(list.map((c) => c.course_id))];
        const { data: courses } = await supabase.from("courses").select("id,title,title_fr").in("id", ids);
        const byId = new Map((courses ?? []).map((c: any) => [c.id, lang === "fr" ? c.title_fr ?? c.title : c.title]));
        list.forEach((c) => (c.course_title = byId.get(c.course_id) as string));
      }
      setCerts(list);
    })();
  }, [user, lang]);

  if (loading || !user || !profile) return null;

  const fullName = profile.full_name || email;
  const locationLine = [profile.city, profile.country].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-soft print:bg-white">
      <div className="container max-w-3xl py-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" asChild>
            <Link to="/profile"><ArrowLeft className="mr-1.5 h-4 w-4" />{t("nav.back")}</Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/cover-letter">Cover letter</Link>
            </Button>
            <Button onClick={() => window.print()} className="bg-grad-primary">
              <Printer className="mr-1.5 h-4 w-4" /> {t("cv.print")}
            </Button>
          </div>
        </div>
      </div>

      <main className="container max-w-3xl pb-16 print:py-0 print:max-w-none">
        <article className="mx-auto rounded-2xl border border-border bg-card p-8 shadow-soft print:rounded-none print:border-0 print:shadow-none print:p-0">
          <header className="border-b-2 border-primary pb-5">
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{fullName}</h1>
            {profile.headline && <p className="mt-1 text-base text-primary font-medium">{profile.headline}</p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{email}</span>}
              {profile.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{profile.phone}</span>}
              {locationLine && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{locationLine}</span>}
              {(profile.links ?? []).map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary">
                  <LinkIcon className="h-3.5 w-3.5" />{l.label || l.url}
                </a>
              ))}
            </div>
          </header>

          {profile.bio && (
            <Section title={t("cv.about")}>
              <p className="text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
            </Section>
          )}

          {(profile.skills?.length ?? 0) > 0 && (
            <Section title={t("cv.skills")}>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills!.map((s) => (
                  <span key={s} className="rounded-md border border-border bg-soft px-2 py-0.5 text-xs print:border-foreground/30">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {(profile.experience?.length ?? 0) > 0 && (
            <Section title={t("cv.experience")}>
              <div className="space-y-4">
                {profile.experience!.map((e, i) => (
                  <div key={i}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-sm">{e.role}{e.org ? ` · ${e.org}` : ""}</h3>
                      {e.period && <span className="text-xs text-muted-foreground">{e.period}</span>}
                    </div>
                    {e.description && <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">{e.description}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(profile.education?.length ?? 0) > 0 && (
            <Section title={t("cv.education")}>
              <div className="space-y-2">
                {profile.education!.map((e, i) => (
                  <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span><strong>{e.degree}</strong>{e.school ? ` — ${e.school}` : ""}</span>
                    {e.year && <span className="text-muted-foreground">{e.year}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {certs.length > 0 && (
            <Section title={t("cv.certificates")}>
              <div className="space-y-2">
                {certs.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="inline-flex items-baseline gap-1.5">
                      <Award className="h-3.5 w-3.5 text-primary translate-y-0.5" />
                      <span><strong>{c.course_title ?? "Course"}</strong></span>
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(c.issued_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")} · #{c.code.slice(0, 8)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <footer className="mt-8 border-t border-border pt-3 text-center text-[11px] text-muted-foreground print:border-foreground/30">
            {t("cv.footer")}
          </footer>
        </article>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-primary">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
