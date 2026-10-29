import { PlusIcon } from "@heroicons/react/24/outline";
import type { SiteComponentType } from "@/types";
import { PillButton } from "@/components/shared/ui/PillButton";
import { myWebMutedClassName, myWebOptionClassName } from "@/features/myWeb/components/myWebStyles";

interface AddBlockMenuProps {
  id: string;
  options: { type: SiteComponentType; label: string; description?: string }[];
  open: boolean;
  onToggle: () => void;
  onAdd: (type: SiteComponentType) => void;
}

export const AddBlockMenu = ({ id, options, open, onToggle, onAdd }: AddBlockMenuProps) => (
  <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-medium tracking-tight">Bloques de la página</h3>
      <PillButton variant="outline" onClick={onToggle} aria-expanded={open} aria-controls={id}>
        <PlusIcon className="size-4" aria-hidden="true" />
        Añadir bloque
      </PillButton>
    </div>
    <div id={id} hidden={!open}>
      {open && (
        <div className="grid min-w-0 gap-2 rounded-[28px] border border-[#010000]/20 p-3 sm:grid-cols-2">
          {options.map((option) => (
            <button key={option.type} type="button" onClick={() => onAdd(option.type)} className={`${myWebOptionClassName} min-h-11`}>
              <span className="block text-sm font-medium">{option.label}</span>
              {option.description && <span className={`mt-1 block ${myWebMutedClassName}`}>{option.description}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);
