import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";

export const LangToggle = () => {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "fr" : "en")}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-sm font-medium text-foreground/80 backdrop-blur transition hover:bg-card hover:text-foreground"
      aria-label="Toggle language"
    >
      <Globe className="h-4 w-4" />
      <span>{lang.toUpperCase()}</span>
      <span className="text-muted-foreground">/ {lang === "en" ? "FR" : "EN"}</span>
    </button>
  );
};
