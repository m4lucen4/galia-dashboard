import React, { useState } from "react";
import { SitePageDataProps } from "../../../types";
import { PageEditor } from "./PageEditor";
import { useAppDispatch } from "../../../redux/hooks";
import {
  updateSitePage,
  reorderSitePages,
} from "../../../redux/actions/SitePageActions";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

interface PageListProps {
  pages: SitePageDataProps[];
}

export const PageList: React.FC<PageListProps> = ({ pages }) => {
  const dispatch = useAppDispatch();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleVisible = (page: SitePageDataProps) => {
    // "home" page cannot be hidden
    if (page.slug === "home") return;
    dispatch(
      updateSitePage({
        pageId: page.id,
        updates: { visible: !page.visible },
      }),
    );
  };

  const handleToggleNav = (page: SitePageDataProps) => {
    dispatch(
      updateSitePage({
        pageId: page.id,
        updates: { show_in_nav: !page.show_in_nav },
      }),
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updates = [
      { id: pages[index].id, position: index },
      { id: pages[index - 1].id, position: index + 1 },
    ];
    dispatch(reorderSitePages(updates));
  };

  const handleMoveDown = (index: number) => {
    if (index >= pages.length - 1) return;
    const updates = [
      { id: pages[index].id, position: index + 2 },
      { id: pages[index + 1].id, position: index + 1 },
    ];
    dispatch(reorderSitePages(updates));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-black">Páginas</h2>

      <div className="space-y-2">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className="border border-gray-200 rounded-md bg-white"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <button
                className="flex items-center gap-2 flex-1 text-left"
                onClick={() =>
                  setExpandedId(expandedId === page.id ? null : page.id)
                }
              >
                <ChevronRightIcon
                  className={`h-4 w-4 text-gray-500 transition-transform ${
                    expandedId === page.id ? "rotate-90" : ""
                  }`}
                />
                <span className="text-sm font-medium text-gray-900">
                  {page.title}
                </span>
                {!page.visible && (
                  <span className="text-xs text-gray-400 ml-1">(oculta)</span>
                )}
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Subir"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index >= pages.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Bajar"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleNav(page)}
                  className={`p-1 ${
                    page.show_in_nav
                      ? "text-gray-600"
                      : "text-gray-300"
                  } hover:text-gray-600`}
                  title={
                    page.show_in_nav
                      ? "Visible en el menú"
                      : "Oculta del menú"
                  }
                >
                  <Bars3Icon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleVisible(page)}
                  disabled={page.slug === "home"}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title={page.visible ? "Ocultar página" : "Mostrar página"}
                >
                  {page.visible ? (
                    <EyeIcon className="h-4 w-4" />
                  ) : (
                    <EyeSlashIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {expandedId === page.id && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                <PageEditor page={page} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
