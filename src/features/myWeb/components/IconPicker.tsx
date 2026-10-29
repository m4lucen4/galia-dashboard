import React, { useState, useRef, useEffect, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { myWebControlClassName, myWebIconButtonClassName, myWebLabelClassName } from "@/features/myWeb/components/myWebStyles";
import { PillButton } from "@/components/shared/ui/PillButton";

const ALL_ICONS = Object.entries(LucideIcons).filter(
  ([name, value]) =>
    /^[A-Z]/.test(name) &&
    value != null &&
    name !== "createLucideIcon",
) as [string, LucideIcon][];

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_ICONS.slice(0, 80);
    const q = search.toLowerCase();
    return ALL_ICONS.filter(([name]) => name.toLowerCase().includes(q)).slice(
      0,
      120,
    );
  }, [search]);

  const SelectedIcon = value
    ? (LucideIcons as unknown as Record<string, LucideIcon>)[value]
    : null;

  return (
    <div ref={containerRef} className="relative min-w-0">
      <p className={myWebLabelClassName}>Icono del botón</p>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Elegir icono: ${value || "sin icono"}`}
          aria-expanded={open}
          className={`${myWebControlClassName} flex w-auto items-center gap-2`}
        >
          {SelectedIcon ? (
            <>
              <SelectedIcon className="h-4 w-4" />
              <span className="text-xs text-gray-500">{value}</span>
            </>
          ) : (
            <span className="text-gray-400 text-xs">Sin icono</span>
          )}
        </button>
        {value && (
          <PillButton variant="outline" aria-label="Quitar icono" onClick={() => onChange("")}>Quitar</PillButton>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-[28px] border border-[#010000]/30 bg-[#d8e4d6] shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar icono..."
              aria-label="Buscar icono"
              className={myWebControlClassName}
            />
          </div>
          <div className="grid max-h-64 grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-1 overflow-y-auto p-2">
            {filtered.map(([name, Icon]) => (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                aria-pressed={value === name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                  setSearch("");
                }}
                className={`${myWebIconButtonClassName} ${value === name ? "bg-[#010000] text-[#d8e4d6] hover:bg-[#010000]" : ""}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="p-3 text-xs text-gray-400 text-center">
              Sin resultados
            </p>
          )}
        </div>
      )}
    </div>
  );
};
