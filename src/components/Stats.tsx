import { useI18n } from "@/lib/i18n";

export const Stats = () => {
  const { t } = useI18n();
  const items = [
    { v: "12k+", l: t("stats.learners") },
    { v: "40+", l: t("stats.courses") },
    { v: "60+", l: t("stats.partners") },
    { v: "1.5k+", l: t("stats.placements") },
  ];
  return (
    <section className="border-y border-border/60 bg-background">
      <div className="container grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
        {items.map((s) => (
          <div key={s.l} className="text-center">
            <div className="font-display text-3xl font-bold text-primary md:text-4xl">{s.v}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
