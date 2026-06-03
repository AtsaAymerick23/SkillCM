import { Briefcase, Building2, GraduationCap, HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const items = [
  { icon: Briefcase, type: "Job", title: "Junior Web Developer", org: "Yaoundé Tech Hub", tag: "Yaoundé · Full-time" },
  { icon: GraduationCap, type: "Internship", title: "Data Analyst Intern", org: "MTN Cameroon", tag: "Douala · 6 months" },
  { icon: HandCoins, type: "Grant", title: "Youth Startup Fund", org: "National Employment Fund", tag: "Up to 5M FCFA" },
  { icon: Building2, type: "Program", title: "Digital Marketing Bootcamp", org: "Orange Foundation", tag: "Free · 8 weeks" },
];

export const Opportunities = () => {
  return (
    <section id="opportunities" className="bg-soft py-20 md:py-28">
      <div className="container">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">Opportunity Hub</span>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-5xl">Verified opportunities, weekly</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Jobs, internships, grants and programs from trusted partners across Cameroon.
            </p>
          </div>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map((it) => (
            <article key={it.title} className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:shadow-soft">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                <it.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-secondary/30 text-foreground">{it.type}</Badge>
                  <span className="text-xs text-muted-foreground">{it.tag}</span>
                </div>
                <h3 className="mt-1 font-display text-lg font-semibold leading-tight group-hover:text-primary">{it.title}</h3>
                <p className="text-sm text-muted-foreground">{it.org}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
