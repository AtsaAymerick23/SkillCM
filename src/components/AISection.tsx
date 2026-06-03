import { useI18n } from "@/lib/i18n";
import { Brain, Check } from "lucide-react";

export const AISection = () => {
  const { t } = useI18n();
  const features = ["ai.f1", "ai.f2", "ai.f3", "ai.f4", "ai.f5"];
  return (
    <section className="py-20 md:py-28">
      <div className="container grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">{t("ai.kicker")}</span>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-5xl">{t("ai.title")}</h2>
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-foreground/85">{t(f)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-grad-primary opacity-20 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-elevated">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-grad-primary text-primary-foreground shadow-glow animate-float">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <div className="font-display font-semibold">AI Career Coach</div>
                <div className="text-xs text-muted-foreground">Online · Multilingual</div>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="rounded-2xl rounded-tl-sm bg-muted p-3">
                What career fits a student in Douala who likes design?
              </div>
              <div className="ml-8 rounded-2xl rounded-tr-sm bg-grad-primary p-3 text-primary-foreground">
                Based on local demand, try the <b>UI/UX Design</b> track. 3 internships in Douala match your profile this week.
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted p-3">
                Generate my CV in French.
              </div>
              <div className="ml-8 rounded-2xl rounded-tr-sm bg-accent p-3 text-accent-foreground">
                Ready ✓ — exported PDF with verified certificates attached.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
