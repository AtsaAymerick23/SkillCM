import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save, FileDown, User as UserIcon, Upload, Sparkles } from "lucide-react";

type Edu = { school: string; degree: string; year: string };
type Exp = { role: string; org: string; period: string; description: string };
type Link = { label: string; url: string };

type ProfileForm = {
  full_name: string;
  headline: string;
  bio: string;
  phone: string;
  city: string;
  country: string;
  target_role: string;
  key_project_summary: string;
  cover_letter_recipient: string;
  avatar_url: string;
  skills: string[];
  education: Edu[];
  experience: Exp[];
  links: Link[];
};

const empty: ProfileForm = {
  full_name: "",
  headline: "",
  bio: "",
  phone: "",
  city: "",
  country: "Cameroon",
  target_role: "",
  key_project_summary: "",
  cover_letter_recipient: "",
  avatar_url: "",
  skills: [],
  education: [],
  experience: [],
  links: [],
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileForm>(empty);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name,headline,bio,phone,city,country,skills,education,experience,links,avatar_url,target_role,key_project_summary,cover_letter_recipient")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          full_name: data.full_name ?? "",
          headline: data.headline ?? "",
          bio: data.bio ?? "",
          phone: data.phone ?? "",
          city: data.city ?? "",
          country: data.country ?? "Cameroon",
          target_role: (data as any).target_role ?? "",
          key_project_summary: (data as any).key_project_summary ?? "",
          cover_letter_recipient: (data as any).cover_letter_recipient ?? "",
          avatar_url: data.avatar_url ?? "",
          skills: data.skills ?? [],
          education: (data.education as any) ?? [],
          experience: (data.experience as any) ?? [],
          links: (data.links as any) ?? [],
        });
      });
  }, [user]);

  const update = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addSkill = () => {
    const raw = skillInput.trim();
    if (!raw) return;
    // Accept comma-separated bulk entry too
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const next = [...form.skills];
    parts.forEach((p) => { if (!next.includes(p)) next.push(p); });
    update("skills", next);
    setSkillInput("");
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600", upsert: true,
    });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploading(false);
    if (updErr) { toast.error(updErr.message); return; }
    update("avatar_url", url);
    toast.success("Profile picture updated");
    // Trigger header refresh
    window.dispatchEvent(new CustomEvent("profile:avatar-updated", { detail: { url } }));
  };

  const generateSummary = async () => {
    if (!user) return;
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-cv", {
      body: {
        mode: "cv_summary",
        profile: { ...form, email: user.email },
      },
    });
    setAiLoading(false);
    if (error) { toast.error(error.message); return; }
    const content = (data as any)?.content as string | undefined;
    if (!content) { toast.error("No content returned"); return; }
    // Place into bio (replace) — user can still edit
    const summary = content.split(/KEY ACHIEVEMENTS:/i)[0].replace(/^SUMMARY:\s*/i, "").trim();
    update("bio", summary || content);
    toast.success("AI summary generated — review and save");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        headline: form.headline,
        bio: form.bio,
        phone: form.phone,
        city: form.city,
        country: form.country,
        target_role: form.target_role,
        key_project_summary: form.key_project_summary,
        cover_letter_recipient: form.cover_letter_recipient,
        skills: form.skills,
        education: form.education as any,
        experience: form.experience as any,
        links: form.links as any,
      } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("profile.saved"));
  };

  if (loading || !user) return null;

  const initials = (form.full_name || user.email || "U")
    .split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-soft">
      <SiteHeader />
      <main className="container max-w-4xl py-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-grad-primary text-primary-foreground shadow-soft">
              <UserIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary">{t("profile.kicker")}</p>
              <h1 className="font-display text-3xl font-bold md:text-4xl">{t("profile.title")}</h1>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/cv")}>
            <FileDown className="mr-1.5 h-4 w-4" /> {t("profile.viewCv")}
          </Button>
        </div>
        <p className="mt-2 text-muted-foreground">{t("profile.sub")}</p>

        <div className="mt-8 space-y-6">
          {/* Avatar */}
          <Card>
            <CardHeader><CardTitle>Profile picture</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-5">
              <Avatar className="h-20 w-20">
                <AvatarImage src={form.avatar_url || undefined} alt={form.full_name || "Profile"} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }}
                />
                <Button onClick={() => fileRef.current?.click()} disabled={uploading} variant="outline">
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {form.avatar_url ? "Change picture" : "Upload picture"}
                </Button>
                <p className="text-xs text-muted-foreground">PNG/JPG up to 5MB. Shown in your header avatar.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("profile.basics")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label={t("profile.fullName")}><Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} /></Field>
              <Field label={t("profile.headline") + " (Professional title)"}><Input value={form.headline} onChange={(e) => update("headline", e.target.value)} placeholder={t("profile.headlinePh")} /></Field>
              <Field label="Email"><Input value={user.email ?? ""} disabled /></Field>
              <Field label={t("profile.phone")}><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+237…" /></Field>
              <Field label={t("profile.city")}><Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Yaoundé" /></Field>
              <Field label={t("profile.country")}><Input value={form.country} onChange={(e) => update("country", e.target.value)} /></Field>
              <Field label="Target role"><Input value={form.target_role} onChange={(e) => update("target_role", e.target.value)} placeholder="Frontend Developer" /></Field>
              <Field label="Cover letter recipient (company / agency)"><Input value={form.cover_letter_recipient} onChange={(e) => update("cover_letter_recipient", e.target.value)} placeholder="Acme Cameroon" /></Field>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>{t("profile.bio")} (Professional Bio)</Label>
                  <Button size="sm" variant="ghost" onClick={generateSummary} disabled={aiLoading}>
                    {aiLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                    Generate with AI
                  </Button>
                </div>
                <Textarea rows={4} value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder={t("profile.bioPh")} />
              </div>
              <div className="md:col-span-2">
                <Label>Key project summary</Label>
                <Textarea rows={3} value={form.key_project_summary} onChange={(e) => update("key_project_summary", e.target.value)} placeholder="A standout project: what you built, your role, impact." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("profile.skills")} (comma-separated)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  placeholder="HTML5, CSS3, JavaScript, Python basics, WhatsApp catalog marketing"
                />
                <Button onClick={addSkill} variant="outline"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {form.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1.5 pr-1.5">
                    {s}
                    <button onClick={() => update("skills", form.skills.filter((x) => x !== s))} className="rounded-full p-0.5 hover:bg-background/60">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {form.skills.length === 0 && <p className="text-sm text-muted-foreground">{t("profile.noSkills")}</p>}
              </div>
            </CardContent>
          </Card>

          <RowEditor<Exp>
            title={t("profile.experience")}
            rows={form.experience}
            onChange={(r) => update("experience", r)}
            empty={{ role: "", org: "", period: "", description: "" }}
            fields={[
              { key: "role", label: t("profile.exp.role"), placeholder: "Frontend Developer" },
              { key: "org", label: t("profile.exp.org"), placeholder: "Acme Cameroon" },
              { key: "period", label: t("profile.exp.period"), placeholder: "2023 – 2024" },
              { key: "description", label: t("profile.exp.desc"), placeholder: "What you did, impact, tools", textarea: true, full: true },
            ]}
          />

          <RowEditor<Edu>
            title={t("profile.education")}
            rows={form.education}
            onChange={(r) => update("education", r)}
            empty={{ school: "", degree: "", year: "" }}
            fields={[
              { key: "school", label: t("profile.edu.school"), placeholder: "University of Yaoundé I" },
              { key: "degree", label: t("profile.edu.degree"), placeholder: "BSc Computer Science" },
              { key: "year", label: t("profile.edu.year"), placeholder: "2022" },
            ]}
          />

          <RowEditor<Link>
            title={t("profile.links")}
            rows={form.links}
            onChange={(r) => update("links", r)}
            empty={{ label: "", url: "" }}
            fields={[
              { key: "label", label: t("profile.link.label"), placeholder: "GitHub" },
              { key: "url", label: t("profile.link.url"), placeholder: "https://github.com/you" },
            ]}
          />

          <div className="sticky bottom-4 flex justify-end">
            <Button size="lg" onClick={handleSave} disabled={saving} className="bg-grad-primary shadow-elevated">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t("profile.save")}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

type FieldDef<T> = {
  key: keyof T;
  label: string;
  placeholder?: string;
  textarea?: boolean;
  full?: boolean;
};

function RowEditor<T extends Record<string, string>>({
  title, rows, onChange, empty, fields,
}: {
  title: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  empty: T;
  fields: FieldDef<T>[];
}) {
  const { t } = useI18n();
  const setRow = (i: number, key: keyof T, val: string) => {
    const next = rows.slice();
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...rows, { ...empty }]);
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={add}><Plus className="mr-1 h-4 w-4" />{t("profile.add")}</Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("profile.empty")}</p>}
        {rows.map((row, i) => (
          <div key={i} className="rounded-xl border border-border bg-soft p-4">
            <div className="grid gap-3 md:grid-cols-2">
              {fields.map((f) => (
                <div key={String(f.key)} className={f.full ? "md:col-span-2" : ""}>
                  <Label>{f.label}</Label>
                  {f.textarea ? (
                    <Textarea rows={2} value={row[f.key] ?? ""} onChange={(e) => setRow(i, f.key, e.target.value)} placeholder={f.placeholder} />
                  ) : (
                    <Input value={row[f.key] ?? ""} onChange={(e) => setRow(i, f.key, e.target.value)} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => remove(i)} className="text-destructive hover:text-destructive">
                <Trash2 className="mr-1 h-4 w-4" />{t("profile.remove")}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
