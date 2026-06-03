import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LangToggle } from "@/components/LangToggle";
import {
  BookOpen,
  Briefcase,
  Award,
  Users,
  Sparkles,
  FileText,
  LogOut,
  LayoutDashboard,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import logoAsset from "@/assets/skillcm-logo.png.asset.json";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { MentorDashboard } from "@/components/dashboards/MentorDashboard";
import { PointsBadges } from "@/components/PointsBadges";
import { StreakCard } from "@/components/gamification/StreakCard";
import { ProgressTracker } from "@/components/gamification/ProgressTracker";
import { Leaderboard } from "@/components/gamification/Leaderboard";

export default function Dashboard() {
  const { user, loading, rolesLoading, isAdmin, isMentor, signOut: doSignOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setName(data?.full_name ?? null));
  }, [user]);

  const signOut = async () => {
    await doSignOut();
    navigate("/");
  };

  if (loading || rolesLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: BookOpen, label: t("m.learn.t"), to: "/courses" },
    { icon: Briefcase, label: t("m.opp.t"), to: "/opportunities" },
    { icon: Sparkles, label: t("sl.title"), to: "/startup-lab" },
    { icon: Users, label: t("nav.mentors"), to: "/mentors" },
    { icon: Award, label: t("m.cert.t"), to: "/certificates" },
    { icon: FileText, label: t("profile.title"), to: "/profile" },
    { icon: ShieldCheck, label: t("apps.title"), to: "/applications" },
  ];

  const tiles = [
    { icon: BookOpen, label: t("m.learn.t"), accent: "primary", to: "/courses" },
    { icon: Briefcase, label: t("m.opp.t"), accent: "accent", to: "/opportunities" },
    { icon: Sparkles, label: t("sl.title"), accent: "secondary", to: "/startup-lab" },
    { icon: FileText, label: t("profile.title"), accent: "primary", to: "/profile" },
    { icon: Users, label: t("nav.mentors"), accent: "accent", to: "/mentors" },
    { icon: GraduationCap, label: t("m.cert.t"), accent: "secondary", to: "/certificates" },
    { icon: ShieldCheck, label: t("apps.title"), accent: "primary", to: "/applications" },
  ] as const;

  const accentClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary group-hover:bg-primary/15",
    accent: "bg-accent/10 text-accent group-hover:bg-accent/15",
    secondary: "bg-secondary/15 text-secondary group-hover:bg-secondary/20",
  };

  const isAdminOrMentor = isAdmin || isMentor;

  return (
    <div className="min-h-screen bg-soft flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur p-5 gap-6 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2 px-2">
          <img src={logoAsset.url} alt="SkillCM logo" className="h-9 w-auto" />
        </Link>

        <nav className="flex flex-col gap-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">
            Menu
          </p>
          {navItems.map((item) => {
            const active =
              item.to === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-border/60 bg-background/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Signed in
          </p>
          <p className="mt-1 text-sm font-semibold truncate">
            {name ?? user.email}
          </p>
          <Button
            onClick={signOut}
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" /> {t("dash.signout")}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden border-b border-border/60 bg-background/80 backdrop-blur">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoAsset.url} alt="SkillCM logo" className="h-9 w-auto" />
            </Link>
            <div className="flex items-center gap-2">
              <LangToggle />
              <Button onClick={signOut} variant="ghost" size="sm">
                <LogOut className="mr-1.5 h-4 w-4" /> {t("dash.signout")}
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-8 md:px-8 lg:px-10 lg:py-10 max-w-[1400px] mx-auto">
          {/* Greeting */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-fade-up">
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl">
                {t("dash.welcome")}
                {name ? `, ${name.split(" ")[0]}` : ""} 👋
              </h1>
              <p className="mt-2 text-muted-foreground">
                {isAdmin
                  ? "Admin console"
                  : isMentor
                  ? "Mentor workspace"
                  : t("dash.sub")}
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <LangToggle />
            </div>
          </div>

          {isAdmin ? (
            <div className="mt-10">
              <AdminDashboard />
            </div>
          ) : isMentor ? (
            <div className="mt-10">
              <MentorDashboard />
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              {/* Stats row */}
              <div className="grid gap-5 lg:grid-cols-3">
                <ProgressTracker />
                <StreakCard />
                <Leaderboard />
              </div>

              {/* Badges */}
              <PointsBadges />

              {/* Quick actions */}
              <section>
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      Quick actions
                    </p>
                    <h2 className="mt-1 font-display text-xl font-semibold">
                      Jump back in
                    </h2>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {tiles.map((tile) => (
                    <Link
                      key={tile.label}
                      to={tile.to}
                      className="group relative rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated"
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${accentClasses[tile.accent]}`}
                      >
                        <tile.icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-display text-base font-semibold">
                        {tile.label}
                      </h3>
                      <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                        Open
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          )}

          {isAdminOrMentor && (
            <div className="mt-8 lg:hidden">
              <Button onClick={signOut} variant="outline" size="sm">
                <LogOut className="mr-1.5 h-4 w-4" /> {t("dash.signout")}
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
