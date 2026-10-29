import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import {
  EllipsisHorizontalIcon, PencilIcon, ChevronUpIcon, ChevronDownIcon,
  EyeIcon, EyeSlashIcon, Bars3Icon, TrashIcon,
} from "@heroicons/react/24/outline";
import type { SitePageDataProps } from "@/types";
import { myWebIconButtonClassName } from "@/features/myWeb/components/myWebStyles";

interface PageTabMenuProps {
  page: SitePageDataProps;
  custom: boolean;
  first: boolean;
  last: boolean;
  onRename: () => void;
  onToggleNav: () => void;
  onToggleVisible: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

const itemClassName = (focus: boolean) =>
  `flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm disabled:opacity-40 ${focus ? "bg-[#d8e4d6] text-[#010000]" : "text-[#010000]/80"}`;

// HeadlessUI retains keyboard navigation, focus management and anchored positioning.
export function PageTabMenu(props: PageTabMenuProps) {
  const { page } = props;
  return (
    <Menu as="div" className="relative">
      <MenuButton className={myWebIconButtonClassName} aria-label={`Opciones de ${page.title}`} title={`Opciones de ${page.title}`}>
        <EllipsisHorizontalIcon aria-hidden="true" className="size-5" />
      </MenuButton>
      <MenuItems anchor="bottom start" className="z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#010000]/20 bg-[#f4f7f3] p-2 shadow-lg focus:outline-none">
        {props.custom && (
          <MenuItem>{({ focus }) => (
            <button onClick={props.onRename} className={itemClassName(focus)}>
              <PencilIcon aria-hidden="true" className="size-4" />Renombrar
            </button>
          )}</MenuItem>
        )}
        <MenuItem>{({ focus }) => (
          <button onClick={props.onToggleNav} className={itemClassName(focus)}>
            <Bars3Icon aria-hidden="true" className="size-4" />{page.show_in_nav ? "Ocultar del menú" : "Mostrar en menú"}
          </button>
        )}</MenuItem>
        <MenuItem>{({ focus }) => (
          <button onClick={props.onToggleVisible} className={itemClassName(focus)}>
            {page.visible ? <EyeSlashIcon aria-hidden="true" className="size-4" /> : <EyeIcon aria-hidden="true" className="size-4" />}
            {page.visible ? "Ocultar página" : "Mostrar página"}
          </button>
        )}</MenuItem>
        {props.custom && <div className="my-1 border-t border-[#010000]/10" />}
        <MenuItem>{({ focus }) => (
          <button onClick={props.onMoveUp} disabled={props.first} className={itemClassName(focus)}>
            <ChevronUpIcon aria-hidden="true" className="size-4" />Mover arriba
          </button>
        )}</MenuItem>
        <MenuItem>{({ focus }) => (
          <button onClick={props.onMoveDown} disabled={props.last} className={itemClassName(focus)}>
            <ChevronDownIcon aria-hidden="true" className="size-4" />Mover abajo
          </button>
        )}</MenuItem>
        {props.custom && (
          <>
            <div className="my-1 border-t border-[#010000]/10" />
            <MenuItem>{({ focus }) => (
              <button onClick={props.onDelete} className={`${itemClassName(focus)} text-red-700`}>
                <TrashIcon aria-hidden="true" className="size-4" />Eliminar
              </button>
            )}</MenuItem>
          </>
        )}
      </MenuItems>
    </Menu>
  );
}
