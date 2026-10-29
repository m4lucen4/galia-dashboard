import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { PillButton } from "@/components/shared/ui/PillButton";
import { myWebControlClassName } from "@/features/myWeb/components/myWebStyles";

export type LinkType = "url" | "email" | "tel";

interface LinkPopoverProps {
  popoverRef: RefObject<HTMLDivElement | null>;
  position: { top: number; left: number };
  type: LinkType;
  value: string;
  hasLink: boolean;
  onTypeChange: (type: LinkType) => void;
  onValueChange: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
  onDismiss: () => void;
}

export const LinkPopover = ({ popoverRef, position, type, value, hasLink, onTypeChange, onValueChange, onApply, onRemove, onDismiss }: LinkPopoverProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Editar enlace"
      style={{ top: position.top, left: `max(8px, min(${position.left}px, calc(100vw - 20rem)))` }}
      className="fixed z-50 w-80 max-w-[calc(100vw-1rem)] space-y-3 rounded-[28px] border border-[#010000]/30 bg-[#d8e4d6] p-4 shadow-lg"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onDismiss();
        }
      }}
    >
      <div role="group" aria-label="Tipo de enlace" className="flex flex-wrap gap-1">
        {([
          { value: "url", label: "Enlace" },
          { value: "email", label: "Email" },
          { value: "tel", label: "Teléfono" },
        ] as const).map((option) => (
          <PillButton key={option.value} variant={type === option.value ? "solid" : "outline"} aria-pressed={type === option.value} onClick={() => onTypeChange(option.value)} className="px-3">
            {option.label}
          </PillButton>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        aria-label={type === "email" ? "Correo electrónico" : type === "tel" ? "Número de teléfono" : "Dirección del enlace"}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onApply();
          }
        }}
        placeholder={type === "email" ? "nombre@ejemplo.com" : type === "tel" ? "+34 600 000 000" : "https://ejemplo.com o /proyectos"}
        className={myWebControlClassName}
      />
      <div className="flex flex-wrap items-center gap-2">
        {hasLink && <PillButton variant="outline" onClick={onRemove}>Quitar enlace</PillButton>}
        <PillButton onClick={onApply} disabled={!value.trim()}>Aplicar</PillButton>
        <PillButton variant="outline" onClick={onDismiss}>Cerrar</PillButton>
      </div>
    </div>
  );
};
