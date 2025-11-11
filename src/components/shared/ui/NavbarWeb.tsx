import { useState, useEffect } from "react";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../redux/store";
import { Link, useNavigate } from "react-router-dom";

import logoImage from "../../../assets/logo.webp";
import { checkAuthState } from "../../../redux/actions/AuthActions";

function classNames(
  ...classes: (string | undefined | null | boolean)[]
): string {
  return classes.filter(Boolean).join(" ");
}

export default function NavbarWeb() {
  const { authenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("");

  const navigation = [
    { name: "Características", href: "#caracteristicas" },
    { name: "FAQ", href: "#faq" },
    { name: "Precios", href: "#precios" },
    { name: "Contacto", href: "#contacto" },
    { name: "Wiki", href: "/wiki" },
  ];

  const handleNavigation = (href: string) => {
    if (href.startsWith("#")) {
      const sectionId = href.replace("#", "");
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        setActiveSection(sectionId);
      }
    } else {
      navigate(href);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      await dispatch(checkAuthState());
    };

    checkAuth();
  }, [dispatch]);

  return (
    <Disclosure as="nav" className="bg-white shadow-sm fixed w-full top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Mobile menu button */}
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Abrir menú principal</span>
              <Bars3Icon
                aria-hidden="true"
                className="block h-6 w-6 group-data-[open]:hidden"
              />
              <XMarkIcon
                aria-hidden="true"
                className="hidden h-6 w-6 group-data-[open]:block"
              />
            </DisclosureButton>
          </div>

          {/* Logo */}
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start ">
            <div className="flex flex-shrink-0 items-center">
              <Link to="/" className="flex items-center">
                <img src={logoImage} alt="Mocklab" className="h-8 w-auto" />
              </Link>
            </div>

            {/* Desktop navigation */}
            <div className="hidden sm:ml-8 sm:block">
              <div className="flex space-x-4">
                {navigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={classNames(
                      activeSection === item.href.replace("#", "")
                        ? "text-gray-900 border-b-2 border-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300",
                      "px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2 border-transparent"
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Auth buttons */}
          <div className="hidden sm:flex items-center sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            {authenticated ? (
              <Link
                to="/home"
                className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
              >
                Ir al Panel
              </Link>
            ) : (
              <Link
                to="/login"
                className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <DisclosurePanel className="sm:hidden">
        <div className="space-y-1 px-2 pb-3 pt-2 bg-white border-t border-gray-200">
          {navigation.map((item) => (
            <DisclosureButton
              key={item.name}
              as="button"
              onClick={() => handleNavigation(item.href)}
              className={classNames(
                activeSection === item.href.replace("#", "")
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                "block w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors duration-200"
              )}
            >
              {item.name}
            </DisclosureButton>
          ))}

          {/* Mobile auth button */}
          <div className="pt-4 pb-2 border-t border-gray-200 mt-4">
            {authenticated ? (
              <Link
                to="/home"
                className="block w-full text-center bg-black text-white px-4 py-2 rounded-md text-base font-medium hover:bg-gray-800 transition-colors duration-200"
              >
                Ir al Panel
              </Link>
            ) : (
              <Link
                to="/login"
                className="block w-full text-center bg-black text-white px-4 py-2 rounded-md text-base font-medium hover:bg-gray-800 transition-colors duration-200"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
