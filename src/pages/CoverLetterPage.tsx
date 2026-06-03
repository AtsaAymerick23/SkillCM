import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Printer, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import logoAsset from "@/assets/skillcm-logo.png.asset.json";

export default function CoverLetterPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [letter, setLetter] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles")
      .select("full_name,headline,bio,phone,city,country,skills,education,experience,links,target_role,key_project_summary,cover_letter_recipient")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile({ ...data, email: user.email }));
  }, [user]);

  const generate = async () => {
    if (!profile) return;
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-cv", {
      body: { mode: "cover_letter", profile },
    });
    setAiLoading(false);
    if (error) { toast.error(error.message); return; }
    const content = (data as any)?.content as string | undefined;
    if (!content) { toast.error("No content returned"); return; }
    setLetter(content);
  };

  if (loading || !user || !profile) return null;
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-soft print:bg-white">
      <div className="container max-w-3xl py-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" asChild>
            <Link to="/profile"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generate} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              Generate with AI
            </Button>
            <Button onClick={() => window.print()} disabled={!letter.trim()} className="bg-grad-primary">
              <Printer className="mr-1.5 h-4 w-4" /> Print / Save as PDF
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Fill your profile target role and cover letter recipient, then click <strong>Generate with AI</strong>. Edit freely, then print.
        </p>
        <Textarea
          rows={20}
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          placeholder="Your cover letter will appear here…"
          className="mt-4 font-sans"
        />
      </div>

      {/* Printable layout */}
      <main className="container max-w-3xl pb-16 hidden print:block print:py-0 print:max-w-none">
        <article className="mx-auto bg-white p-8 print:p-0">
          <header className="flex items-center justify-between border-b-2 border-primary pb-4">
            <div>
              <h1 className="font-display text-2xl font-bold">{profile.full_name || profile.email}</h1>
              {profile.headline && <p className="text-sm text-primary">{profile.headline}</p>}
              <p className="text-xs text-muted-foreground">
                {[profile.email, profile.phone, [profile.city, profile.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
              </p>
            </div>
            <img src={logoAsset.url} alt="SkillCM" className="h-10 w-auto" />
          </header>
          <p className="mt-6 text-sm text-muted-foreground">{today}</p>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed">{letter}</pre>
        </article>
      </main>
    </div>
  );
}
