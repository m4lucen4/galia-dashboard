import { BookOpenIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { AdministrationToolCard } from "@/features/administration/components/AdministrationToolCard";

export const Administration = () => {
  const { t } = useTranslation();

  return (
    <div className="min-w-0 space-y-10">
      <header className="space-y-3 border-b border-[#010000]/15 pb-8">
        <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-5xl">
          {t("administration.title")}
        </h1>
        <p className="text-base leading-relaxed text-[#010000]/65">
          {t("administration.description")}
        </p>
      </header>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <AdministrationToolCard
          title={t("administration.wiki.title")}
          description={t("administration.wiki.description")}
          actionLabel={t("administration.wiki.action")}
          to="/wiki/admin"
          icon={<BookOpenIcon className="size-6" />}
        />
      </div>
    </div>
  );
};
