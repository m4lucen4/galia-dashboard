import type { ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, EyeIcon, EyeSlashIcon, TrashIcon } from "@heroicons/react/24/outline";
// Keep block-header controls independent from configuration and editor controls.
const blockIconButtonClassName = "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#010000]/30 transition-colors focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";
const blockControlClassName = `${blockIconButtonClassName} text-[#010000] enabled:hover:bg-[#FBEA71]`;
const blockDeleteClassName = `${blockIconButtonClassName} text-[#751D1D] hover:bg-[#FBD5CE]`;

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
    <section className={`min-w-0 rounded-[28px] border text-[#010000] ${expanded ? "border-[#010000] ring-1 ring-[#010000]" : "border-[#010000]/30"}`} aria-labelledby={headingId}>
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-t-[27px] bg-[#E5EBE2] p-3 sm:p-4 ${expanded ? "" : "rounded-b-[27px]"}`}>
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
            <span className="block text-2xl font-semibold tracking-[-0.03em]">{label}</span>
            {summary && <span className="block truncate text-sm text-[#010000]/85">{summary}</span>}
            {!visible && <span className="block text-sm font-medium text-[#010000]">Oculto en tu web</span>}
          </span>
        </button>
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={onMoveUp} disabled={first} className={blockControlClassName} aria-label={`Subir bloque: ${label}`}>
            <ChevronUpIcon className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={last} className={blockControlClassName} aria-label={`Bajar bloque: ${label}`}>
            <ChevronDownIcon className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onToggleVisible} className={blockControlClassName} aria-label={`${visible ? "Ocultar" : "Mostrar"} bloque: ${label}`}>
            {visible ? <EyeIcon className="size-4" aria-hidden="true" /> : <EyeSlashIcon className="size-4" aria-hidden="true" />}
          </button>
          <button type="button" onClick={onDelete} className={blockDeleteClassName} aria-label={`Eliminar bloque: ${label}`}>
            <TrashIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id={contentId} hidden={!expanded} className="min-w-0 space-y-4 rounded-b-[27px] border-t border-[#010000]/30 bg-[#F4F7F3] p-4 sm:p-5">
        {expanded && children}
      </div>
    </section>
  );
};
