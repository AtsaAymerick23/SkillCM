import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { LangToggle } from "@/components/LangToggle";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logoAsset from "@/assets/skillcm-logo.png.asset.json";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { t, lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const redirectTo = (location.state as any)?.from || "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");

  useEffect(() => {
    if (!authLoading && user) navigate(redirectTo, { replace: true });
  }, [user, authLoading, navigate, redirectTo]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signupRole, setSignupRole] = useState<"student" | "mentor">("student");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: name, preferred_language: lang, signup_role: signupRole },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Welcome!");
          navigate("/dashboard");
        } else {
          // Auto-confirm may not be active — try signing in directly
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            toast.success("Account created. Check your email to verify.");
          } else {
            navigate("/dashboard");
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate("/dashboard");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left visual */}
      <div className="relative hidden bg-grad-primary lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(50_97%_53%/0.35),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="SkillCM logo" className="h-12 w-auto rounded-lg bg-white/90 p-1" />
          </Link>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              {t("hero.title")}
            </h2>
            <p className="mt-4 max-w-md text-white/85">{t("hero.subtitle")}</p>
          </div>
          <div className="flex h-1.5 w-32 overflow-hidden rounded-full">
            <span className="flex-1 bg-primary-foreground" />
            <span className="flex-1 bg-secondary" />
            <span className="flex-1 bg-accent" />
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
          <LangToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-12">
          <h1 className="font-display text-3xl font-bold">
            {mode === "signin" ? t("auth.signin") : t("auth.signup")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? t("auth.no") : t("auth.have")}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? t("auth.signup") : t("auth.signin")}
            </button>
          </p>

          <Button onClick={google} variant="outline" className="mt-8 w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            {t("auth.google")}
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />{t("auth.or")}<span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("auth.name")}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>I am joining as</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSignupRole("student")}
                      className={`rounded-md border px-3 py-2 text-sm transition ${signupRole === "student" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}
                    >
                      Youth Cadet
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupRole("mentor")}
                      className={`rounded-md border px-3 py-2 text-sm transition ${signupRole === "mentor" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}
                    >
                      Mentor
                    </button>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-grad-primary shadow-soft">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? t("auth.signin") : t("auth.signup")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
