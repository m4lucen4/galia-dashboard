import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FolderOpenIcon, HomeIcon, PhotoIcon, SparklesIcon, UsersIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useAppSelector } from "@/redux/hooks";
import { Tooltip } from "@/components/shared/ui/Tooltip";

export const DashboardNavigation = ({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) => {
  const { t } = useTranslation();
  const role = useAppSelector((state) => state.auth.user?.role);
  const items = [
    { key: "home", href: "/home", icon: HomeIcon },
    ...(role === "admin" ? [{ key: "users", href: "/users", icon: UsersIcon }] : []),
    { key: "projects", href: "/projects", icon: FolderOpenIcon },
    { key: "multimedia", href: "/multimedia", icon: PhotoIcon },
    { key: "publishes", href: "/preview-projects", icon: PaperAirplaneIcon },
    { key: "gpts", href: "/my-gpts", icon: SparklesIcon },
  ];

  return (
    <nav aria-label="Navegación principal" className="space-y-2">
      {items.map(({ key, href, icon: Icon }) => (
        <Tooltip key={key} label={t(`menu.${key}`)} disabled={!collapsed}>
          <NavLink to={href} end onClick={onNavigate} className={({ isActive }) =>
            `flex min-h-12 items-center gap-3 rounded-full py-3 text-sm font-medium ${collapsed ? "justify-center px-3" : "px-4"} ${isActive ? "bg-[#010000] text-[#d8e4d6]" : "text-[#010000] hover:bg-[#010000]/5"}`
          }>
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className={collapsed ? "sr-only" : undefined}>{t(`menu.${key}`)}</span>
          </NavLink>
        </Tooltip>
      ))}
    </nav>
  );
};
