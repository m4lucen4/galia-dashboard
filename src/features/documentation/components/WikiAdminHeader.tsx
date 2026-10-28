import { BookOpenIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

export const WikiAdminHeader = () => {
  const { t } = useTranslation();

  return (
    <header className="border-b border-[#010000]/15 pb-8">
      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#010000]/20 sm:size-14">
          <BookOpenIcon aria-hidden="true" className="size-6" />
        </span>
        <h1 className="min-w-0 text-3xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-5xl">
          {t("administration.wiki.title")}
        </h1>
      </div>
    </header>
  );
};
