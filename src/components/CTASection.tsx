import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  const { t } = useI18n();
  return (
    <section id="about" className="py-20 md:py-28">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-grad-primary p-10 text-primary-foreground shadow-elevated md:p-16">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-secondary/40 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-accent/40 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("cta.title")}</h2>
            <p className="mt-4 text-lg text-white/85">{t("cta.sub")}</p>
            <Button asChild size="lg" className="mt-8 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link to="/auth?mode=signup">
                {t("cta.btn")} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
