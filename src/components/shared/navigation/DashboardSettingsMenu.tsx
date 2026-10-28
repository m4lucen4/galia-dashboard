import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Cog6ToothIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logout } from "@/redux/actions/AuthActions";
import { Alert } from "@/components/shared/ui/Alert";
import { Tooltip } from "@/components/shared/ui/Tooltip";

export const DashboardSettingsMenu = ({ collapsed = false }: { collapsed?: boolean }) => {
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const items = [
    { key: "profile", href: "/profile" },
    { key: "socialWeb", href: "/settings" },
    { key: "wiki", href: "/wiki" },
    ...(user?.role === "admin" ? [{ key: "administration", href: "/administration" }] : []),
  ];

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(false);
    try {
      await dispatch(logout()).unwrap();
      navigate("/login");
    } catch {
      setLogoutError(true);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="mt-auto border-t border-[#010000]/15 pt-5">
      <Menu>
        <Tooltip label={t("menu.settings")} disabled={!collapsed}>
          <MenuButton className={`flex min-h-12 w-full items-center gap-3 rounded-full py-3 text-sm font-medium hover:bg-[#010000]/5 data-open:bg-[#010000]/5 ${collapsed ? "justify-center px-3" : "px-4"}`}>
            <Cog6ToothIcon className="size-5 shrink-0" aria-hidden="true" />
            <span className={collapsed ? "sr-only" : undefined}>{t("menu.settings")}</span>
            {!collapsed && <ChevronUpIcon className="ml-auto size-4" aria-hidden="true" />}
          </MenuButton>
        </Tooltip>
        <MenuItems anchor={collapsed ? "right end" : "top start"} className="z-50 w-60 rounded-3xl border border-[#010000]/15 bg-[#d8e4d6] p-2 font-['Hanken_Grotesk',system-ui,sans-serif] text-sm text-[#010000] shadow-lg [--anchor-gap:12px] focus:outline-none">
          {items.map(({ key, href }) => (
            <MenuItem key={key}>
              <Link to={href} className="block rounded-full px-4 py-3 data-focus:bg-[#010000] data-focus:text-[#d8e4d6]">{t(`menu.${key}`)}</Link>
            </MenuItem>
          ))}
          <div className="my-2 border-t border-[#010000]/15" />
          <MenuItem>
            <button type="button" onClick={() => setConfirmLogout(true)} className="w-full rounded-full px-4 py-3 text-left data-focus:bg-[#010000] data-focus:text-[#d8e4d6]">
              {t("menu.logout")}
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
      {confirmLogout && (
        <Alert title={t("menu.logout")} description={t("menu.confirmLogout")} onAccept={handleLogout} onCancel={() => { setConfirmLogout(false); setLogoutError(false); }} disabledConfirmButton={loggingOut}>
          {logoutError && <p role="alert">No se ha podido cerrar la sesión. Inténtalo de nuevo.</p>}
        </Alert>
      )}
    </div>
  );
};
