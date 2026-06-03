import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { Modules } from "@/components/Modules";
import { AISection } from "@/components/AISection";
import { Opportunities } from "@/components/Opportunities";
import { CTASection } from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Stats />
        <Modules />
        <Opportunities />
        <AISection />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
