import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero.jpg";

export const Hero = () => {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={heroImg} alt="Cameroonian youth learning together" className="h-full w-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-hero" />
      </div>
      <div className="container relative py-24 md:py-36">
        <div className="max-w-3xl animate-fade-up text-primary-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-secondary" />
            {t("hero.badge")}
          </span>
          <h1 className="mt-5 text-balance font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl lg:text-7xl">
            {t("hero.title")}
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-base text-white/85 md:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-secondary text-secondary-foreground shadow-glow hover:bg-secondary/90">
              <Link to="/auth?mode=signup">
                {t("hero.cta.primary")} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-primary-foreground backdrop-blur hover:bg-white/20 hover:text-primary-foreground">
              <a href="#opportunities">{t("hero.cta.secondary")}</a>
            </Button>
          </div>
        </div>
      </div>
      {/* Flag accent */}
      <div className="absolute bottom-0 left-0 right-0 flex h-1.5">
        <span className="flex-1 bg-primary" />
        <span className="flex-1 bg-secondary" />
        <span className="flex-1 bg-accent" />
      </div>
    </section>
  );
};
