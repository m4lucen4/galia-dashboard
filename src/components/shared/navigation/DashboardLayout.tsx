import { useState, type ReactNode } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Bars3Icon, XMarkIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/shared/ui/BrandMark";
import { DashboardPage } from "@/components/shared/ui/DashboardPage";
import { Tooltip } from "@/components/shared/ui/Tooltip";
import { DashboardNavigation } from "./DashboardNavigation";
import { DashboardSettingsMenu } from "./DashboardSettingsMenu";
import "@/features/newWeb/fonts.css";

type SidebarContentProps = {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
};

const SidebarContent = ({ onNavigate, collapsed = false, onToggle }: SidebarContentProps) => (
  <div className={`flex min-h-full flex-col gap-10 py-6 ${collapsed ? "px-3" : "px-6"}`}>
    <div className={`flex h-12 shrink-0 items-center gap-3 ${collapsed ? "justify-center" : "justify-between"}`}>
      {!collapsed && (
        <Link to="/home" onClick={onNavigate} className="shrink-0 rounded-full" aria-label="Mocklab: inicio">
          <BrandMark />
        </Link>
      )}
      {onToggle && (
        <Tooltip label={collapsed ? "Expandir menú" : "Colapsar menú"} disabled={!collapsed}>
          <button type="button" onClick={onToggle} aria-controls="dashboard-sidebar" aria-expanded={!collapsed} aria-label={collapsed ? "Expandir menú" : "Colapsar menú"} className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-[#010000]/5">
            {collapsed ? <ChevronDoubleRightIcon className="size-4" aria-hidden="true" /> : <ChevronDoubleLeftIcon className="size-4" aria-hidden="true" />}
          </button>
        </Tooltip>
      )}
    </div>
    <DashboardNavigation onNavigate={onNavigate} collapsed={collapsed} />
    <DashboardSettingsMenu collapsed={collapsed} />
  </div>
);

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-svh bg-[#d8e4d6] font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000] [&_:where(a,button):focus-visible]:outline-2 [&_:where(a,button):focus-visible]:outline-solid [&_:where(a,button):focus-visible]:outline-current [&_:where(a,button):focus-visible]:outline-offset-4">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-[#010000] focus:px-5 focus:py-3 focus:text-[#d8e4d6]">Saltar al contenido</a>
      <aside id="dashboard-sidebar" aria-label="Menú del dashboard" className={`fixed inset-y-0 left-0 hidden overflow-y-auto border-r border-[#010000]/15 motion-safe:transition-[width] motion-safe:duration-200 lg:block ${collapsed ? "w-20" : "w-64"}`}>
        <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </aside>
      <header className="flex items-center justify-between gap-4 border-b border-[#010000]/15 p-5 lg:hidden">
        <Link to="/home" aria-label="Mocklab: inicio"><BrandMark /></Link>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú" aria-expanded={menuOpen} className="rounded-full border border-[#010000] p-3">
          <Bars3Icon className="size-5" aria-hidden="true" />
        </button>
      </header>
      <Dialog open={menuOpen} onClose={setMenuOpen} className="relative z-40 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000] lg:hidden">
        <DialogBackdrop className="fixed inset-0 bg-[#010000]/40" />
        <DialogPanel className="fixed inset-y-0 left-0 w-72 max-w-[calc(100%-2rem)] overflow-y-auto bg-[#d8e4d6] [&_:where(a,button):focus-visible]:outline-2 [&_:where(a,button):focus-visible]:outline-offset-4">
          <DialogTitle className="sr-only">Menú del dashboard</DialogTitle>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" className="absolute top-6 right-4 rounded-full p-2">
            <XMarkIcon className="size-5" aria-hidden="true" />
          </button>
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </DialogPanel>
      </Dialog>
      <main id="dashboard-content" tabIndex={-1} className={`min-w-0 motion-safe:transition-[margin-left] motion-safe:duration-200 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        <DashboardPage className="py-8 lg:py-12">{children}</DashboardPage>
      </main>
    </div>
  );
};
