import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, BookOpen, Search } from "lucide-react";

type Course = {
  id: string;
  slug: string;
  title: string;
  title_fr: string | null;
  description: string | null;
  description_fr: string | null;
  category: string;
  level: string;
  language: string;
  duration_minutes: number;
  thumbnail_url: string | null;
};

export default function Courses() {
  const { t, lang } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState<"newest" | "shortest" | "longest" | "az">("newest");

  useEffect(() => {
    supabase
      .from("courses")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCourses((data as Course[]) ?? []);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(courses.map((c) => c.category))),
    [courses],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = courses.filter((c) => {
      const title = (lang === "fr" ? c.title_fr ?? c.title : c.title).toLowerCase();
      const desc = (lang === "fr" ? c.description_fr ?? c.description ?? "" : c.description ?? "").toLowerCase();
      if (term && !title.includes(term) && !desc.includes(term)) return false;
      if (cat !== "all" && c.category !== cat) return false;
      if (level !== "all" && c.level !== level) return false;
      return true;
    });
    const titleOf = (c: Course) => (lang === "fr" ? c.title_fr ?? c.title : c.title);
    if (sort === "shortest") list.sort((a, b) => a.duration_minutes - b.duration_minutes);
    else if (sort === "longest") list.sort((a, b) => b.duration_minutes - a.duration_minutes);
    else if (sort === "az") list.sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
    return list;
  }, [courses, q, cat, level, lang, sort]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-12">
        <header className="animate-fade-up">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            {t("courses.kicker")}
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-5xl">{t("courses.title")}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("courses.sub")}</p>
        </header>

        <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("courses.search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("courses.allCategories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("courses.allLevels")}</SelectItem>
              <SelectItem value="beginner">{t("courses.beginner")}</SelectItem>
              <SelectItem value="intermediate">{t("courses.intermediate")}</SelectItem>
              <SelectItem value="advanced">{t("courses.advanced")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("courses.sortNewest")}</SelectItem>
              <SelectItem value="shortest">{t("courses.sortShortest")}</SelectItem>
              <SelectItem value="longest">{t("courses.sortLongest")}</SelectItem>
              <SelectItem value="az">{t("courses.sortAZ")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="mt-12 text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.slug}`}
                className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-secondary/30 text-foreground">{c.category}</Badge>
                  <Badge variant="outline">{t(`courses.${c.level}`)}</Badge>
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold leading-snug group-hover:text-primary">
                  {lang === "fr" ? c.title_fr ?? c.title : c.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {lang === "fr" ? c.description_fr ?? c.description : c.description}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {Math.round(c.duration_minutes / 60)}h</span>
                  <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {c.language.toUpperCase()}</span>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-muted-foreground">{t("courses.empty")}</p>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
