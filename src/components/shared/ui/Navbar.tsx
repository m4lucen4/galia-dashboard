import { useState } from "react";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../../redux/store";
import { logout } from "../../../redux/actions/AuthActions";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Alert } from "./Alert";
import { useAppSelector } from "../../../redux/hooks";

import logoImage from "../../../assets/mocklab-bw.png";
import { useTranslation } from "react-i18next";

function classNames(
  ...classes: (string | undefined | null | boolean)[]
): string {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar() {
  const userData = useAppSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const navigation = [
    { name: t("menu.home"), href: "/home", current: false },
    { name: t("menu.users"), href: "/users", current: false, adminOnly: true },
    { name: t("menu.projects"), href: "/projects", current: false },
    { name: t("menu.publishes"), href: "/preview-projects", current: false },
    { name: t("menu.map"), href: "/projects-map", current: false },
  ];

  const currentPath = location.pathname;

  const confirmLogout = () => {
    setShowLogoutAlert(true);
  };
  const cancelLogout = () => {
    setShowLogoutAlert(false);
  };
  const handleLogout = async () => {
    await dispatch(logout()).unwrap();
    navigate("/login");
  };

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || userData?.role === "admin"
  );

  return (
    <Disclosure as="nav" className="bg-black">
      <div className="mx-auto container px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            {/* Mobile menu button*/}
            {userData && (
              <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:ring-2 focus:ring-white focus:outline-hidden focus:ring-inset">
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Open main menu</span>
                <Bars3Icon
                  aria-hidden="true"
                  className="block size-6 group-data-open:hidden"
                />
                <XMarkIcon
                  aria-hidden="true"
                  className="hidden size-6 group-data-open:block"
                />
              </DisclosureButton>
            )}
          </div>
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex shrink-0 items-center justify-center mr-16">
              <img src={logoImage} alt="Logo" className="h-8 w-auto" />
            </div>
            {userData && (
              <div className="hidden  sm:block">
                <div className="flex space-x-4">
                  {filteredNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      aria-current={
                        item.href === currentPath ? "page" : undefined
                      }
                      className={classNames(
                        item.href === currentPath
                          ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white",
                        "rounded-md px-3 py-2 text-sm font-medium"
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            {/* Profile dropdown */}
            {userData ? (
              <Menu as="div" className="relative ml-3">
                <div>
                  <MenuButton className="relative flex rounded-full bg-white text-sm focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-hidden">
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">Open user menu</span>
                    <div className="size-8 rounded-full bg-white flex items-center justify-center">
                      <span className="text-black font-medium">P</span>
                    </div>
                  </MenuButton>
                </div>
                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 ring-1 shadow-lg ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                >
                  <MenuItem>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                    >
                      {t("menu.profile")}
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                    >
                      {t("menu.settings")}
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <button
                      onClick={confirmLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden hover:bg-gray-100"
                    >
                      {t("menu.logout")}
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            ) : (
              <Link
                to="/login"
                className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {t("login.title")}
              </Link>
            )}
          </div>
        </div>
      </div>
      {showLogoutAlert && (
        <Alert
          title={t("menu.logout")}
          description={t("menu.confirmLogout")}
          onAccept={handleLogout}
          onCancel={cancelLogout}
        />
      )}

      {userData && (
        <DisclosurePanel className="sm:hidden">
          <div className="space-y-1 px-2 pt-2 pb-3">
            {filteredNavigation.map((item) => (
              <DisclosureButton
                key={item.name}
                as={Link}
                to={item.href}
                aria-current={item.href === currentPath ? "page" : undefined}
                className={classNames(
                  item.href === currentPath
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white",
                  "block rounded-md px-3 py-2 text-base font-medium"
                )}
              >
                {item.name}
              </DisclosureButton>
            ))}
          </div>
        </DisclosurePanel>
      )}
    </Disclosure>
  );
}
