import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LangToggle } from "./LangToggle";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, LogOut } from "lucide-react";
import logoAsset from "@/assets/skillcm-logo.png.asset.json";
import { NotificationsBell } from "./NotificationsBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

export const SiteHeader = () => {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    if (!user) { setAvatarUrl(null); setFullName(""); return; }
    supabase.from("profiles").select("avatar_url,full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url ?? null);
        setFullName(data?.full_name ?? "");
      });
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.url) setAvatarUrl(detail.url);
    };
    window.addEventListener("profile:avatar-updated", onUpdate);
    return () => window.removeEventListener("profile:avatar-updated", onUpdate);
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = (fullName || user?.email || "U")
    .split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="SkillCM logo" className="h-10 w-auto" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link to="/courses" className="text-foreground/70 transition hover:text-foreground">{t("nav.modules")}</Link>
          <Link to="/opportunities" className="text-foreground/70 transition hover:text-foreground">{t("nav.opportunities")}</Link>
          <Link to="/startup-lab" className="text-foreground/70 transition hover:text-foreground">{t("nav.startup")}</Link>
          <Link to="/mentors" className="text-foreground/70 transition hover:text-foreground">{t("nav.mentors")}</Link>
          <a href="/#about" className="text-foreground/70 transition hover:text-foreground">{t("nav.about")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LangToggle />
          {user ? (
            <>
              <NotificationsBell />
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/dashboard"><LayoutDashboard className="mr-1.5 h-4 w-4" />Dashboard</Link>
              </Button>
              <Link to="/profile" aria-label={t("nav.profile")} className="rounded-full ring-offset-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={avatarUrl || undefined} alt={fullName || "Profile"} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Link>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="mr-1.5 h-4 w-4" />{t("dash.signout")}
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">{t("nav.signin")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-grad-primary shadow-soft hover:opacity-95">
                <Link to="/auth?mode=signup">{t("nav.start")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
