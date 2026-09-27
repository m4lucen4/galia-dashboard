import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export const Administration = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">
        {t("administration.title")}
      </h3>
      <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
        {t("administration.description")}
      </p>
      <section className="mt-6 max-w-2xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h4 className="text-base font-semibold text-gray-900">
          {t("administration.wiki.title")}
        </h4>
        <p className="mt-1 text-sm text-gray-500">
          {t("administration.wiki.description")}
        </p>
        <Link
          to="/wiki/admin"
          className="mt-4 inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t("administration.wiki.action")}
        </Link>
      </section>
    </div>
  );
};
