import type { ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, EyeIcon, EyeSlashIcon, TrashIcon } from "@heroicons/react/24/outline";
import { myWebIconButtonClassName } from "@/features/myWeb/components/myWebStyles";

interface BlockCardProps {
  id: string;
  label: string;
  summary: string | null;
  visible: boolean;
  expanded: boolean;
  first: boolean;
  last: boolean;
  onExpand: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  children: ReactNode;
}

export const BlockCard = ({ id, label, summary, visible, expanded, first, last, onExpand, onMoveUp, onMoveDown, onToggleVisible, onDelete, children }: BlockCardProps) => {
  const contentId = `block-content-${id}`;
  const headingId = `block-heading-${id}`;
  return (
    <section className="min-w-0 rounded-[28px] border border-[#010000]/20" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
        <button
          id={headingId}
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
          onClick={onExpand}
          aria-expanded={expanded}
          aria-controls={contentId}
        >
          <ChevronRightIcon aria-hidden="true" className={`size-4 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{label}</span>
            {summary && <span className="block truncate text-xs text-[#010000]/65">{summary}</span>}
            {!visible && <span className="block text-xs text-[#010000]/65">Oculto en tu web</span>}
          </span>
        </button>
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={onMoveUp} disabled={first} className={myWebIconButtonClassName} aria-label={`Subir bloque: ${label}`}>
            <ChevronUpIcon className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={last} className={myWebIconButtonClassName} aria-label={`Bajar bloque: ${label}`}>
            <ChevronDownIcon className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onToggleVisible} className={myWebIconButtonClassName} aria-label={`${visible ? "Ocultar" : "Mostrar"} bloque: ${label}`}>
            {visible ? <EyeIcon className="size-4" aria-hidden="true" /> : <EyeSlashIcon className="size-4" aria-hidden="true" />}
          </button>
          <button type="button" onClick={onDelete} className={myWebIconButtonClassName} aria-label={`Eliminar bloque: ${label}`}>
            <TrashIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id={contentId} hidden={!expanded} className="min-w-0 space-y-4 border-t border-[#010000]/15 p-4 sm:p-5">
        {expanded && children}
      </div>
    </section>
  );
};
