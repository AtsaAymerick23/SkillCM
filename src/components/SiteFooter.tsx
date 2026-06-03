import { useI18n } from "@/lib/i18n";
import logoAsset from "@/assets/skillcm-logo.png.asset.json";

export const SiteFooter = () => {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/60 bg-soft">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-3">
          <img src={logoAsset.url} alt="SkillCM logo" className="h-9 w-auto" />
          <span>SkillCM — Learn. Earn. Succeed.</span>
        </div>
        <p>© {new Date().getFullYear()} SkillCM. {t("footer.rights")}</p>
      </div>
    </footer>
  );
};
