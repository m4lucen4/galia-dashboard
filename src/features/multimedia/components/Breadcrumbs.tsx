import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

interface BreadcrumbsProps {
  variant?: "default" | "dashboard";
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Breadcrumbs = ({ currentPath, onNavigate, variant = "default" }: BreadcrumbsProps) => {
  const { t } = useTranslation();
  const pathParts =
    currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);

  const buildPath = (index: number) => {
    if (index === -1) return "/";
    return "/" + pathParts.slice(0, index + 1).join("/");
  };

  return (
    <nav className={variant === "dashboard" ? "flex min-w-0 flex-wrap items-center gap-2 text-sm [&_button]:min-w-0 [&_button]:break-all [&_button]:rounded-full [&_button]:px-3 [&_button]:py-2 [&_button]:text-[#010000] [&_button]:hover:bg-[#010000]/5 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_svg]:shrink-0" : "flex items-center space-x-2 text-sm"}>
      <button
        onClick={() => onNavigate("/")}
        className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
          currentPath === "/" ? "text-blue-600 font-medium" : "text-gray-600"
        }`}
      >
        <HomeIcon className="h-4 w-4" />
        <span>{t("multimedia.home")}</span>
      </button>

      {pathParts.map((part, index) => (
        <div key={index} className={variant === "dashboard" ? "flex min-w-0 max-w-full items-center gap-2" : "flex items-center gap-2"}>
          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => onNavigate(buildPath(index))}
            className={`px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
              index === pathParts.length - 1
                ? "text-blue-600 font-medium"
                : "text-gray-600"
            }`}
          >
            {part}
          </button>
        </div>
      ))}
    </nav>
  );
};
