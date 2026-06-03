import { useI18n } from "@/lib/i18n";
import {
  GraduationCap, BadgeCheck, Briefcase, Lightbulb, Shield, Users, FileText,
} from "lucide-react";

const modules = [
  { icon: GraduationCap, key: "learn", color: "primary" },
  { icon: BadgeCheck, key: "cert", color: "secondary" },
  { icon: Briefcase, key: "opp", color: "accent" },
  { icon: Lightbulb, key: "ent", color: "primary" },
  { icon: Shield, key: "cit", color: "accent" },
  { icon: Users, key: "men", color: "secondary" },
  { icon: FileText, key: "cv", color: "primary" },
] as const;

const colorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/20 text-accent",
  accent: "bg-accent/10 text-accent",
};

export const Modules = () => {
  const { t } = useI18n();
  return (
    <section id="modules" className="bg-soft py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">{t("modules.kicker")}</span>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-5xl">{t("modules.title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("modules.subtitle")}</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ icon: Icon, key, color }, i) => (
            <article
              key={key}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-elevated"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[color]}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{t(`m.${key}.t`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`m.${key}.d`)}</p>
              <div className="absolute -bottom-1 left-0 h-1 w-0 bg-grad-primary transition-all duration-500 group-hover:w-full" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
